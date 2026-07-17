import mongoose from 'mongoose';
import { Post } from './post.model.js';
import { User } from '../users/user.model.js';
import { AppConfig } from '../admin/appConfig.model.js';
import { getInactiveUserIds } from '../../shared/utils/userFilters.js';
import { getOrSetCache } from '../../shared/utils/cache.js';

// ---------------------------------------------------------------------------
// Signal Registry - Pluggable architecture for feed ranking signals
// New signals can be added by calling registerSignal(name, fn, defaultWeight)
// without modifying the core scoring logic.
// ---------------------------------------------------------------------------

const signalRegistry = new Map();

/**
 * Register a new scoring signal.
 * @param {string} name - Unique signal name (must match a key in weights)
 * @param {Function} fn - (post, context) => number (raw score contribution)
 * @param {number} defaultWeight - Default weight if not overridden by config
 */
export const registerSignal = (name, fn, defaultWeight) => {
  signalRegistry.set(name, { fn, defaultWeight });
};

/**
 * Remove a registered signal by name.
 * @param {string} name - Signal name to unregister
 */
export const unregisterSignal = (name) => {
  signalRegistry.delete(name);
};

/**
 * Get all registered signal names.
 * @returns {string[]}
 */
export const getRegisteredSignals = () => [...signalRegistry.keys()];

// ---------------------------------------------------------------------------
// Default Weights - Configurable via AppConfig 'feed_recommendation_weights'
// ---------------------------------------------------------------------------

const DEFAULT_WEIGHTS = {
  likes: 3,
  saves: 7,
  // NOTE: comments, shares, views signals are registered but dormant.
  // The Post schema currently only has likesCount and savesCount fields.
  // These signals will activate once the schema is extended with
  // commentsCount, sharesCount, and viewsCount fields.
  comments: 4,
  shares: 5,
  views: 1,
  creatorFollowers: 2,
  creatorQuality: 3,
  verification: 2,
  freshness: 8,
  randomness: 1,
  newCreatorBoost: 4,
  // Legacy keys preserved for backward compatibility
  preferenceWeight: 0.8,
  discoveryWeight: 0.2,
  popularityLikeMultiplier: 3,
  popularitySaveMultiplier: 5,
  recencyBoostHours: 48,
};

// ---------------------------------------------------------------------------
// Normalization Utilities
// ---------------------------------------------------------------------------
// Why log2? Engagement counts (likes, saves, views) follow a power-law
// distribution: a few posts receive thousands of interactions while most receive
// single digits. Raw counts would let viral posts dominate the score, drowning
// out newer or niche content. Log2 compresses the range (e.g., 1->1, 8->3,
// 1024->10) so that the *relative* difference between 10 and 100 likes
// contributes roughly the same score gap as 100 vs 1000. This keeps the feed
// balanced without entirely ignoring popularity.
//
// Alternative normalizers are provided for experimentation:
//   - normalizeSqrt: gentler compression (good for low-count metrics)
//   - normalizeLinear: no compression (passthrough)
//   - normalizeLog10: stronger compression than log2

/**
 * Logarithmic (base 2) normalization. Compresses power-law distributions.
 * @param {number} value - Raw count (non-negative)
 * @returns {number} Normalized value (0 when value is 0)
 */
export const normalizeLog = (value) => {
  if (value <= 0) return 0;
  return Math.log2(1 + value);
};

/**
 * Square root normalization. Gentler compression than log2.
 * @param {number} value - Raw count (non-negative)
 * @returns {number} Normalized value
 */
export const normalizeSqrt = (value) => {
  if (value <= 0) return 0;
  return Math.sqrt(value);
};

/**
 * Linear normalization (identity/passthrough). No compression applied.
 * @param {number} value - Raw count
 * @returns {number} Same value unchanged
 */
export const normalizeLinear = (value) => {
  return value;
};

/**
 * Logarithmic (base 10) normalization. Stronger compression than log2.
 * @param {number} value - Raw count (non-negative)
 * @returns {number} Normalized value
 */
export const normalizeLog10 = (value) => {
  if (value <= 0) return 0;
  return Math.log10(1 + value);
};

// ---------------------------------------------------------------------------
// Built-in Signal Implementations
// ---------------------------------------------------------------------------

// Likes signal: log2-normalized like count
registerSignal('likes', (post) => {
  return normalizeLog(post.likesCount || 0);
}, 3);

// Saves signal: log2-normalized save count (highest engagement weight)
registerSignal('saves', (post) => {
  return normalizeLog(post.savesCount || 0);
}, 7);

// Comments signal: DORMANT - commentsCount field does not yet exist on Post schema.
// Will always return 0 until schema is extended. Registered for forward compatibility.
registerSignal('comments', (post) => {
  return normalizeLog(post.commentsCount || 0);
}, 4);

// Shares signal: DORMANT - sharesCount field does not yet exist on Post schema.
// Will always return 0 until schema is extended. Registered for forward compatibility.
registerSignal('shares', (post) => {
  return normalizeLog(post.sharesCount || 0);
}, 5);

// Views signal: DORMANT - viewsCount field does not yet exist on Post schema.
// Will always return 0 until schema is extended. Registered for forward compatibility.
registerSignal('views', (post) => {
  return normalizeLog(post.viewsCount || 0);
}, 1);

// Creator Followers signal: author's follower count
registerSignal('creatorFollowers', (post) => {
  const author = post.authorId;
  if (!author || typeof author !== 'object') return 0;
  return Math.log2(1 + (author.stats?.followers || 0));
}, 2);

// Creator Quality signal: average engagement per post for the author
registerSignal('creatorQuality', (post, context) => {
  if (!context.creatorQualityMap) return 0;
  const authorId = typeof post.authorId === 'object'
    ? post.authorId._id?.toString()
    : post.authorId?.toString();
  if (!authorId) return 0;
  const quality = context.creatorQualityMap.get(authorId);
  return quality !== undefined ? Math.log2(1 + quality) : 0;
}, 3);

// Verification signal: bonus for verified creators
registerSignal('verification', (post) => {
  const author = post.authorId;
  if (!author || typeof author !== 'object') return 0;
  if (author.isVerified) return 5;
  return 0;
}, 2);

// Freshness signal: gravity-based time decay
// score_multiplier = 1 / (1 + (hours_since_posted / half_life_hours)^gravity)
registerSignal('freshness', (post, context) => {
  const currentTime = context.currentTime || Date.now();
  const postTime = new Date(post.createdAt).getTime();
  const hoursSincePosted = Math.max(0, (currentTime - postTime) / (1000 * 60 * 60));
  const halfLife = 24; // 24 hours
  const gravity = 1.5;
  const decayMultiplier = 1 / (1 + Math.pow(hoursSincePosted / halfLife, gravity));
  // Return a score from 0-10 based on freshness
  return decayMultiplier * 10;
}, 8);

// New Creator Boost signal: accounts < 30 days old OR < 10 total posts get a boost
registerSignal('newCreatorBoost', (post, context) => {
  const author = post.authorId;
  if (!author || typeof author !== 'object') return 0;

  const currentTime = context.currentTime || Date.now();
  const accountAge = author.createdAt
    ? (currentTime - new Date(author.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    : 999;

  const postCount = context.creatorPostCountMap
    ? context.creatorPostCountMap.get(
        author._id?.toString() || ''
      ) || 999
    : 999;

  // New creator if account < 30 days OR < 10 posts
  if (accountAge < 30 || postCount < 10) {
    return 1.5; // Boost multiplier contribution
  }
  return 0;
}, 4);

// Randomness signal: adds a small random factor to prevent staleness
registerSignal('randomness', (post, context) => {
  // Seeded by post ID for consistency within a single scoring pass
  const hash = post._id?.toString() || '';
  let seed = 0;
  for (let i = 0; i < hash.length; i++) {
    seed = ((seed << 5) - seed + hash.charCodeAt(i)) | 0;
  }
  // Normalize to 0-1 range
  return Math.abs(Math.sin(seed + (context.randomSeed || 0))) * 2;
}, 1);

// ---------------------------------------------------------------------------
// Core Scoring Engine
// ---------------------------------------------------------------------------

/**
 * Score a single post using all registered signals and their weights.
 * @param {Object} post - Post document (lean, populated)
 * @param {Object} context - Scoring context (seenCreatorIds, userInterests, currentTime, etc.)
 * @param {Object} weights - Signal weights map
 * @returns {number} Composite score
 */
export const scorePost = (post, context, weights) => {
  let totalScore = 0;

  for (const [name, { fn }] of signalRegistry) {
    const weight = weights[name] !== undefined ? weights[name] : 0;
    if (weight === 0) continue;

    try {
      const signalValue = fn(post, context);
      totalScore += signalValue * weight;
    } catch (err) {
      // Gracefully handle signal computation errors - skip the signal
      console.error(`[Ranking] Signal "${name}" error:`, err.message);
    }
  }

  return totalScore;
};

// ---------------------------------------------------------------------------
// Diversity Logic - Prevents consecutive posts from same creator
// ---------------------------------------------------------------------------

/**
 * Apply diversity re-ordering to prevent consecutive posts from the same creator.
 * If an author appeared in the last 2 positions, apply a heavy penalty.
 * @param {Array} posts - Scored posts array sorted by score descending
 * @param {Object} [stats] - Optional stats object; if provided, stats.diversitySwaps is incremented
 * @returns {Array} Re-ordered posts with diversity applied
 */
const applyDiversity = (posts, stats) => {
  if (posts.length <= 2) return posts;

  const result = [];
  const remaining = [...posts];

  while (remaining.length > 0) {
    let placed = false;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      const candidateAuthorId = getAuthorIdString(candidate);

      // Check if this author appeared in the last 2 positions
      const recentAuthors = result.slice(-2).map(p => getAuthorIdString(p));
      const isConsecutive = recentAuthors.includes(candidateAuthorId);

      if (!isConsecutive) {
        // If i > 0, a swap occurred (skipped earlier candidates)
        if (i > 0 && stats) {
          stats.diversitySwaps = (stats.diversitySwaps || 0) + 1;
        }
        result.push(candidate);
        remaining.splice(i, 1);
        placed = true;
        break;
      }
    }

    // If all remaining are from recent authors, place the first one anyway
    if (!placed) {
      result.push(remaining.shift());
    }
  }

  return result;
};

/**
 * Extract author ID as string from a post object.
 */
const getAuthorIdString = (post) => {
  if (!post.authorId) return '';
  if (typeof post.authorId === 'object') {
    return post.authorId._id?.toString() || post.authorId.toString();
  }
  return post.authorId.toString();
};

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Fetch configurable recommendation weights from AppConfig.
 * Falls back to DEFAULT_WEIGHTS if no config entry exists.
 * Merges stored config with defaults so new signals always have a weight.
 */
export const getRecommendationWeights = async () => {
  const config = await AppConfig.findOne({ key: 'feed_recommendation_weights' }).lean();

  if (config && config.value) {
    // Merge stored values over defaults so new signals get their defaults
    return { ...DEFAULT_WEIGHTS, ...config.value };
  }

  return { ...DEFAULT_WEIGHTS };
};

/**
 * Get user signals for feed personalization.
 * @param {string} userId
 * @returns {Object} { interestSignals, hasPreferences }
 */
export const getUserFeedSignals = async (userId) => {
  const user = await User.findById(userId).select('interests username').lean();

  console.log('[getUserFeedSignals] userId:', userId, '| found:', !!user, '| username:', user?.username, '| interests:', JSON.stringify(user?.interests), '| count:', user?.interests?.length);

  if (!user) {
    return { interestSignals: [], hasPreferences: false };
  }

  return {
    interestSignals: user.interests || [],
    hasPreferences: !!(user.interests && user.interests.length > 0),
  };
};

/**
 * Build creator quality map: average (likes + saves) per post for each author.
 * Uses a cache key derived from the sorted authorIds to prevent cross-request
 * cache collisions (each unique set of authors gets its own cache entry).
 * @param {string[]} authorIds - Unique author IDs to compute quality for
 * @returns {Map<string, number>} authorId -> average engagement
 */
const buildCreatorQualityMap = async (authorIds) => {
  if (!authorIds || authorIds.length === 0) return new Map();

  // Build a deterministic cache key from the sorted author set.
  // For large sets, use a simple hash to keep key length manageable.
  const sortedIds = [...authorIds].sort();
  let keySegment;
  if (sortedIds.length <= 5) {
    keySegment = sortedIds.join(',');
  } else {
    // Use two independent 32-bit hashes (djb2 + sdbm) to produce a longer key,
    // reducing collision probability for large author sets from ~1/2^31 to ~1/2^53.
    const joined = sortedIds.join(',');
    let hash1 = 5381; // djb2
    let hash2 = 0;    // sdbm
    for (let i = 0; i < joined.length; i++) {
      const ch = joined.charCodeAt(i);
      hash1 = ((hash1 << 5) + hash1 + ch) | 0;
      hash2 = (ch + (hash2 << 6) + (hash2 << 16) - hash2) | 0;
    }
    keySegment = `h${Math.abs(hash1).toString(36)}${Math.abs(hash2).toString(36)}_n${sortedIds.length}`;
  }
  const cacheKey = `ranking:creatorQuality:${keySegment}`;

  const fetchQuality = async () => {
    // Mongoose aggregate() does NOT apply schema-level casting to pipeline stages.
    // authorId stores ObjectIds, so we must explicitly cast string IDs to ObjectId
    // for the $in match to work correctly.
    const objectIds = authorIds.map(id => new mongoose.Types.ObjectId(id));
    const pipeline = [
      { $match: { authorId: { $in: objectIds }, deletedAt: null } },
      {
        $group: {
          _id: '$authorId',
          avgEngagement: { $avg: { $add: [{ $ifNull: ['$likesCount', 0] }, { $ifNull: ['$savesCount', 0] }] } },
          postCount: { $sum: 1 },
        },
      },
    ];

    try {
      const results = await Post.aggregate(pipeline);
      const map = {};
      for (const r of results) {
        map[r._id.toString()] = r.avgEngagement || 0;
      }
      return map;
    } catch (err) {
      console.error('[Ranking] Creator quality aggregation error:', err.message);
      return {};
    }
  };

  try {
    const qualityObj = await getOrSetCache(cacheKey, 300, fetchQuality);
    const map = new Map();
    if (qualityObj) {
      for (const [key, val] of Object.entries(qualityObj)) {
        map.set(key, val);
      }
    }
    return map;
  } catch (err) {
    // Fallback: compute without cache
    const qualityObj = await fetchQuality();
    const map = new Map();
    for (const [key, val] of Object.entries(qualityObj)) {
      map.set(key, val);
    }
    return map;
  }
};

/**
 * Build creator post count map for new creator boost detection.
 * @param {string[]} authorIds
 * @returns {Map<string, number>}
 */
const buildCreatorPostCountMap = async (authorIds) => {
  if (!authorIds || authorIds.length === 0) return new Map();

  try {
    // Mongoose aggregate() does NOT apply schema-level casting to pipeline stages.
    // authorId stores ObjectIds, so we must explicitly cast string IDs to ObjectId
    // for the $in match to work correctly.
    const objectIds = authorIds.map(id => new mongoose.Types.ObjectId(id));
    const pipeline = [
      { $match: { authorId: { $in: objectIds }, deletedAt: null } },
      { $group: { _id: '$authorId', count: { $sum: 1 } } },
    ];
    const results = await Post.aggregate(pipeline);
    const map = new Map();
    for (const r of results) {
      map.set(r._id.toString(), r.count);
    }
    return map;
  } catch (err) {
    console.error('[Ranking] Creator post count error:', err.message);
    return new Map();
  }
};

/**
 * Build base query for post fetching with safety filters.
 */
const buildBaseQuery = async (showMatureContent, cursor) => {
  const query = { deletedAt: null };

  // Exclude posts from banned/suspended users
  const inactiveIds = await getInactiveUserIds();
  if (inactiveIds.length > 0) {
    query.authorId = { $nin: inactiveIds };
  }

  // NSFW filtering
  if (!showMatureContent) {
    query.isNsfw = { $ne: true };
  }

  // Cursor-based pagination
  if (cursor) {
    query._id = { $lt: cursor };
  }

  return query;
};

// ---------------------------------------------------------------------------
// Excluded Posts Helper - Categorize candidates that didn't make the final feed
// ---------------------------------------------------------------------------

/**
 * Compare scored candidates against the final feed and return exclusion reasons.
 * Limited to max 10 entries to avoid oversized debug responses.
 * @param {Array} scoredPosts - All scored candidates sorted by score desc
 * @param {Array} finalFeed - Final feed posts after all filtering
 * @param {number} limit - Feed limit used for cutoff calculation
 * @returns {Array} Excluded posts with reasons (max 10)
 */
const buildExcludedPosts = (scoredPosts, finalFeed, limit) => {
  const finalFeedIds = new Set(finalFeed.map(p => p._id.toString()));
  const excluded = [];

  // The score cutoff is the lowest score in the final feed
  const finalScores = scoredPosts
    .filter(s => finalFeedIds.has(s.post._id.toString()))
    .map(s => s.score);
  const scoreCutoff = finalScores.length > 0 ? Math.min(...finalScores) : 0;

  for (const s of scoredPosts) {
    if (excluded.length >= 10) break;
    const postId = s.post._id.toString();
    if (finalFeedIds.has(postId)) continue;

    let reason;
    if (s.score < scoreCutoff) {
      reason = 'Below score cutoff';
    } else if (s.score >= scoreCutoff) {
      // Post scored high enough but was removed by diversity or overflow
      // Check if it shares an author with adjacent posts in the feed
      const authorId = getAuthorIdString(s.post);
      const authorInFeed = finalFeed.some(p => getAuthorIdString(p) === authorId);
      if (authorInFeed) {
        reason = 'Diversity filter';
      } else {
        reason = 'Candidate window overflow';
      }
    }

    excluded.push({
      postId,
      caption: (s.post.caption || '').substring(0, 60),
      score: Math.round(s.score * 100) / 100,
      reason,
    });
  }

  return excluded;
};

// ---------------------------------------------------------------------------
// Main Feed Builder - Home Feed (Personalized)
// ---------------------------------------------------------------------------

/**
 * Build a recommended feed for the Home screen.
 * Uses the full signal registry for scoring with diversity enforcement.
 *
 * Returns null if the user has no preferences (triggers fallback to existing algorithm).
 *
 * @param {string} userId - Authenticated user's ID
 * @param {string|null} cursor - Pagination cursor (post _id)
 * @param {number} limit - Number of posts to return
 * @param {boolean} showMatureContent - Whether to include NSFW posts
 * @param {Object} [options] - Additional options
 * @param {boolean} [options.debug] - When true, returns debug info with score breakdowns
 * @returns {Object|null} Feed result { data, meta, debug? } or null for fallback
 */
export const buildRecommendedFeed = async (userId, cursor, limit, showMatureContent, options = {}) => {
  const debugMode = options.debug === true;
  const pipelineTimeline = debugMode ? [] : null;
  let stageStart = debugMode ? Date.now() : 0;

  // Step 1: Get user signals
  const signals = await getUserFeedSignals(userId);

  // Step 2: If no preferences, return null to trigger existing algorithm fallback
  if (!signals.hasPreferences) {
    return null;
  }

  // Step 3: Get recommendation weights (merged with defaults)
  const weights = await getRecommendationWeights();

  // Step 4: Build base query with safety filters
  const baseQuery = await buildBaseQuery(showMatureContent, cursor);

  // Step 5: Fetch 3x limit candidate posts for scoring headroom
  const fetchLimit = limit * 3;

  const candidatePosts = await Post.find(baseQuery)
    .sort({ _id: -1 })
    .limit(fetchLimit)
    .populate('authorId', 'username avatarUrl role isVerified verifiedType stats createdAt')
    .lean();

  if (debugMode) {
    pipelineTimeline.push({ stage: 'fetchCandidates', durationMs: Date.now() - stageStart });
    stageStart = Date.now();
  }

  if (candidatePosts.length === 0) {
    return { data: [], meta: { nextCursor: null, hasNextPage: false } };
  }

  // Step 6: Build context for scoring
  const authorIds = [...new Set(candidatePosts.map(p => getAuthorIdString(p)).filter(Boolean))];
  const [creatorQualityMap, creatorPostCountMap] = await Promise.all([
    buildCreatorQualityMap(authorIds),
    buildCreatorPostCountMap(authorIds),
  ]);

  const context = {
    seenCreatorIds: new Set(),
    userInterests: signals.interestSignals,
    currentTime: Date.now(),
    creatorQualityMap,
    creatorPostCountMap,
    randomSeed: Date.now() % 10000,
  };

  // Step 7: Score all candidate posts
  const startTime = debugMode ? Date.now() : 0;

  const scoredPosts = candidatePosts.map(post => {
    const signalDetails = {};
    let totalScore = 0;

    for (const [name, { fn }] of signalRegistry) {
      const weight = weights[name] !== undefined ? weights[name] : 0;
      if (weight === 0) {
        if (debugMode) {
          signalDetails[name] = { raw: 0, weight, contribution: 0 };
        }
        continue;
      }
      try {
        const raw = fn(post, context);
        const contribution = raw * weight;
        totalScore += contribution;
        if (debugMode) {
          signalDetails[name] = { raw, weight, contribution };
        }
      } catch (err) {
        console.error(`[Ranking] Signal "${name}" error:`, err.message);
        if (debugMode) {
          signalDetails[name] = { raw: 0, weight, contribution: 0, error: err.message };
        }
      }
    }

    return {
      post,
      score: totalScore,
      ...(debugMode ? { signalDetails } : {}),
    };
  });

  // Sort by score descending
  scoredPosts.sort((a, b) => b.score - a.score);

  if (debugMode) {
    pipelineTimeline.push({ stage: 'scoring', durationMs: Date.now() - stageStart });
    stageStart = Date.now();
  }

  // Step 8: Calculate exploration slots (10% of feed)
  const explorationSlotCount = Math.max(1, Math.floor(limit * 0.1));
  const mainSlotCount = limit - explorationSlotCount;

  // Step 9: Select top-scored posts for main slots
  const mainCandidates = scoredPosts.slice(0, mainSlotCount * 2).map(s => s.post);

  // Step 10: Select exploration posts - low-engagement or new posts NOT matching user interests
  const interestSet = new Set(signals.interestSignals);
  const explorationCandidates = scoredPosts
    .filter(s => {
      const postTypes = Array.isArray(s.post.artworkType) ? s.post.artworkType : [];
      const matchesInterest = postTypes.some(type => interestSet.has(type));
      return !matchesInterest;
    })
    .slice(-explorationSlotCount * 3) // Take from the bottom (lower scored = discovery)
    .map(s => s.post);

  // Shuffle exploration candidates for randomness
  for (let i = explorationCandidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.abs(Math.sin(i + context.randomSeed)) * (i + 1));
    [explorationCandidates[i], explorationCandidates[j]] = [explorationCandidates[j], explorationCandidates[i]];
  }

  const explorationPosts = explorationCandidates.slice(0, explorationSlotCount);

  // Track exploration post IDs for debug
  const explorationPostIds = debugMode
    ? new Set(explorationPosts.map(p => p._id.toString()))
    : null;

  // Step 11: Combine main + exploration candidates (NO diversity yet)
  const mainPosts = mainCandidates.slice(0, mainSlotCount);
  const combined = [...mainPosts, ...explorationPosts].slice(0, limit);

  // Step 12: Fresh content guarantee - ensure at least 30% of returned posts
  // are from the last 48 hours (if enough fresh posts exist in the pool).
  // This prevents established/high-engagement content from completely dominating.
  // Fresh injection runs BEFORE diversity so that injected posts also respect
  // the diversity constraint (no consecutive same-creator posts).
  const fortyEightHoursAgo = context.currentTime - (48 * 60 * 60 * 1000);
  const freshThreshold = Math.ceil(limit * 0.3);

  const freshInFeed = combined.filter(p => new Date(p.createdAt).getTime() >= fortyEightHoursAgo);
  let injectedFeed = combined;

  if (freshInFeed.length < freshThreshold) {
    // Find fresh posts from the candidate pool that are not already in the feed
    const feedIds = new Set(combined.map(p => p._id.toString()));
    const freshCandidates = scoredPosts
      .filter(s => {
        const postTime = new Date(s.post.createdAt).getTime();
        return postTime >= fortyEightHoursAgo && !feedIds.has(s.post._id.toString());
      })
      .map(s => s.post);

    const needed = freshThreshold - freshInFeed.length;
    const freshToInject = freshCandidates.slice(0, needed);

    if (freshToInject.length > 0) {
      // Interleave fresh posts at positions 2, 5, 8, ... (0-indexed: 1, 4, 7, ...)
      // Remove the lowest-scored non-fresh posts from the tail to make room
      const nonFreshInFeed = combined.filter(p => new Date(p.createdAt).getTime() < fortyEightHoursAgo);
      const feedCopy = [...combined];

      // Remove tail items to make room (keep feed length constant)
      const toRemove = Math.min(freshToInject.length, nonFreshInFeed.length);
      for (let r = 0; r < toRemove; r++) {
        const tailItem = nonFreshInFeed[nonFreshInFeed.length - 1 - r];
        const tailIdx = feedCopy.findIndex(p => p._id.toString() === tailItem._id.toString());
        if (tailIdx !== -1) feedCopy.splice(tailIdx, 1);
      }

      // Insert fresh posts at interleaved positions (2, 5, 8, ...)
      for (let i = 0; i < freshToInject.length; i++) {
        const insertPos = Math.min(1 + i * 3, feedCopy.length); // positions 1, 4, 7 (0-indexed)
        feedCopy.splice(insertPos, 0, freshToInject[i]);
      }

      injectedFeed = feedCopy.slice(0, limit);
    }
  }

  if (debugMode) {
    pipelineTimeline.push({ stage: 'freshInjection', durationMs: Date.now() - stageStart });
    stageStart = Date.now();
  }

  // Step 13: Apply ONE final diversity pass on the combined+injected result.
  // This ensures no consecutive posts from the same creator in the final output,
  // including any freshly injected posts.
  const diversityStats = debugMode ? { diversitySwaps: 0 } : null;
  const finalFeed = applyDiversity(injectedFeed, diversityStats).slice(0, limit);

  if (debugMode) {
    pipelineTimeline.push({ stage: 'diversity', durationMs: Date.now() - stageStart });
  }

  // Step 14: Determine pagination
  // KNOWN TRADEOFF: Pagination drift under score reordering.
  // The cursor advances chronologically (oldest _id from the candidate pool), but
  // results are served in score-reordered sequence. Posts that scored below the
  // cutoff in one window's 3x candidate pool are permanently skipped -- they will
  // never appear in subsequent pages because the cursor has already advanced past
  // them. This means up to (fetchLimit - limit) posts per page are silently
  // discarded. On active platforms, new creator content depends on the
  // newCreatorBoost signal being strong enough to push posts into the top third.
  // The alternative (anchoring cursor to lowest-scored returned post or
  // server-side scoring state) adds significant complexity. This is an accepted
  // tradeoff for cursor-based feeds with post-fetch scoring.
  const hasNextPage = candidatePosts.length >= fetchLimit;
  let nextCursor = null;
  if (hasNextPage && finalFeed.length > 0) {
    // Use the oldest _id from the original candidate set that was fetched
    const oldestCandidate = candidatePosts[candidatePosts.length - 1];
    nextCursor = oldestCandidate._id.toString();
  }

  const result = { data: finalFeed, meta: { nextCursor, hasNextPage } };

  // Step 15: Build debug info if requested
  if (debugMode) {
    const executionTimeMs = Date.now() - startTime;
    const fortyEightHoursAgoDebug = context.currentTime - (48 * 60 * 60 * 1000);

    const allScores = scoredPosts.map(s => s.score);
    const averageScore = allScores.length > 0
      ? allScores.reduce((sum, s) => sum + s, 0) / allScores.length
      : 0;

    const freshPostCount = finalFeed.filter(
      p => new Date(p.createdAt).getTime() >= fortyEightHoursAgoDebug
    ).length;

    const explorationPostCount = explorationPostIds
      ? finalFeed.filter(p => explorationPostIds.has(p._id.toString())).length
      : 0;

    // Build score breakdowns for each post in the final feed
    const scoreBreakdowns = finalFeed.map(post => {
      const postId = post._id.toString();
      const scored = scoredPosts.find(s => s.post._id.toString() === postId);
      const author = post.authorId;
      const authorUsername = (author && typeof author === 'object') ? author.username : '';

      // Determine selection reasons
      const selectionReasons = [];
      if (new Date(post.createdAt).getTime() >= fortyEightHoursAgoDebug) {
        selectionReasons.push('Fresh Candidate');
      }
      if (explorationPostIds && explorationPostIds.has(postId)) {
        selectionReasons.push('Exploration Slot');
      }
      // Check if interest match
      const postTypes = Array.isArray(post.artworkType) ? post.artworkType : [];
      const interestSet2 = new Set(signals.interestSignals);
      if (postTypes.some(type => interestSet2.has(type))) {
        selectionReasons.push('Interest Match');
      }
      // New creator check
      if (author && typeof author === 'object') {
        const accountAge = author.createdAt
          ? (context.currentTime - new Date(author.createdAt).getTime()) / (1000 * 60 * 60 * 24)
          : 999;
        const authorId = author._id?.toString() || '';
        const postCount = creatorPostCountMap.get(authorId) || 999;
        if (accountAge < 30 || postCount < 10) {
          selectionReasons.push('New Creator Boost');
        }
      }
      if (selectionReasons.length === 0) {
        selectionReasons.push('Score Ranked');
      }

      return {
        postId,
        caption: (post.caption || '').substring(0, 60),
        authorUsername,
        createdAt: post.createdAt,
        finalScore: scored ? scored.score : 0,
        signals: scored?.signalDetails || {},
        selectionReasons,
      };
    });

    result.debug = {
      candidatesEvaluated: candidatePosts.length,
      executionTimeMs,
      averageScore: Math.round(averageScore * 100) / 100,
      freshPostCount,
      explorationPostCount,
      diversitySwaps: diversityStats ? diversityStats.diversitySwaps : 0,
      pipelineTimeline,
      excludedPosts: buildExcludedPosts(scoredPosts, finalFeed, limit),
      scoreBreakdowns,
    };
  }

  return result;
};

// ---------------------------------------------------------------------------
// Explore Feed Builder
// ---------------------------------------------------------------------------

/**
 * Build a ranked Explore feed with the following composition:
 *   ~50% engagement-ranked (highest scored by engagement signals)
 *   ~30% fresh (posts < 48 hours to guarantee recent content visibility)
 *   ~20% new creators (accounts < 30 days OR < 20 posts for discovery)
 *
 * @param {string|null} userId - Authenticated user's ID (nullable for guests)
 * @param {string|null} cursor - Pagination cursor
 * @param {number} limit - Number of posts to return
 * @param {boolean} showMatureContent - Whether to include NSFW posts
 * @param {string|null} artworkType - Optional artwork type filter
 * @returns {Object} { data, meta: { nextCursor, hasNextPage } }
 */
export const buildExploreFeed = async (userId, cursor, limit, showMatureContent, artworkType, options = {}) => {
  const debugMode = options.debug === true;
  const pipelineTimeline = debugMode ? [] : null;
  let stageStart = debugMode ? Date.now() : 0;

  // Build base query
  const baseQuery = await buildBaseQuery(showMatureContent, cursor);

  // Optional artwork type filter
  if (artworkType) {
    const escapedType = artworkType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    baseQuery.artworkType = { $regex: `^${escapedType}$`, $options: 'i' };
  }

  // Fetch a larger candidate pool for ranking
  const fetchLimit = limit * 3;

  const candidatePosts = await Post.find(baseQuery)
    .sort({ _id: -1 })
    .limit(fetchLimit)
    .populate('authorId', 'username avatarUrl role isVerified verifiedType stats createdAt')
    .lean();

  if (debugMode) {
    pipelineTimeline.push({ stage: 'fetchCandidates', durationMs: Date.now() - stageStart });
    stageStart = Date.now();
  }

  if (candidatePosts.length === 0) {
    return { data: [], meta: { nextCursor: null, hasNextPage: false } };
  }

  // Build scoring context
  const authorIds = [...new Set(candidatePosts.map(p => getAuthorIdString(p)).filter(Boolean))];
  const [creatorQualityMap, creatorPostCountMap] = await Promise.all([
    buildCreatorQualityMap(authorIds),
    buildCreatorPostCountMap(authorIds),
  ]);

  const weights = await getRecommendationWeights();
  const currentTime = Date.now();
  const startTime = debugMode ? Date.now() : 0;

  const context = {
    seenCreatorIds: new Set(),
    userInterests: [],
    currentTime,
    creatorQualityMap,
    creatorPostCountMap,
    randomSeed: currentTime % 10000,
  };

  // Score all candidates
  const scoredPosts = candidatePosts.map(post => {
    const signalDetails = {};
    let totalScore = 0;

    for (const [name, { fn }] of signalRegistry) {
      const weight = weights[name] !== undefined ? weights[name] : 0;
      if (weight === 0) {
        if (debugMode) {
          signalDetails[name] = { raw: 0, weight, contribution: 0 };
        }
        continue;
      }
      try {
        const raw = fn(post, context);
        const contribution = raw * weight;
        totalScore += contribution;
        if (debugMode) {
          signalDetails[name] = { raw, weight, contribution };
        }
      } catch (err) {
        console.error(`[Ranking] Signal "${name}" error:`, err.message);
        if (debugMode) {
          signalDetails[name] = { raw: 0, weight, contribution: 0, error: err.message };
        }
      }
    }

    return {
      post,
      score: totalScore,
      ...(debugMode ? { signalDetails } : {}),
    };
  });

  // Sort by score for trending pool
  scoredPosts.sort((a, b) => b.score - a.score);

  if (debugMode) {
    pipelineTimeline.push({ stage: 'scoring', durationMs: Date.now() - stageStart });
    stageStart = Date.now();
  }

  // Calculate slot distribution: 50% engagement, 30% fresh, 20% new creators
  const engagementSlots = Math.ceil(limit * 0.5);
  const freshSlots = Math.ceil(limit * 0.3);
  const newCreatorSlots = Math.max(1, limit - engagementSlots - freshSlots);

  // Pool 1: Engagement-ranked (top scored)
  const engagementPool = scoredPosts.slice(0, engagementSlots * 2);

  // Pool 2: Fresh uploads (< 48 hours) - prioritize recent content visibility
  const fortyEightHoursAgo = currentTime - (48 * 60 * 60 * 1000);
  const freshPool = scoredPosts.filter(s => {
    const postTime = new Date(s.post.createdAt).getTime();
    return postTime >= fortyEightHoursAgo;
  });

  // Pool 3: New creators (accounts < 30 days OR < 20 posts)
  const newCreatorPool = scoredPosts.filter(s => {
    const author = s.post.authorId;
    if (!author || typeof author !== 'object') return false;
    const accountAge = author.createdAt
      ? (currentTime - new Date(author.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      : 999;
    const authorId = getAuthorIdString(s.post);
    const postCount = creatorPostCountMap.get(authorId) || 0;
    return accountAge < 30 || postCount < 20;
  });

  // Select from each pool, avoiding duplicates
  const selectedIds = new Set();
  const result = [];

  // Fill engagement slots
  for (const s of engagementPool) {
    if (result.length >= engagementSlots) break;
    const id = s.post._id.toString();
    if (!selectedIds.has(id)) {
      selectedIds.add(id);
      result.push(s.post);
    }
  }

  // Fill fresh slots
  for (const s of freshPool) {
    if (result.length >= engagementSlots + freshSlots) break;
    const id = s.post._id.toString();
    if (!selectedIds.has(id)) {
      selectedIds.add(id);
      result.push(s.post);
    }
  }

  // Fill new creator slots
  for (const s of newCreatorPool) {
    if (result.length >= limit) break;
    const id = s.post._id.toString();
    if (!selectedIds.has(id)) {
      selectedIds.add(id);
      result.push(s.post);
    }
  }

  // If we still need more posts, fill from remaining scored posts
  if (result.length < limit) {
    for (const s of scoredPosts) {
      if (result.length >= limit) break;
      const id = s.post._id.toString();
      if (!selectedIds.has(id)) {
        selectedIds.add(id);
        result.push(s.post);
      }
    }
  }

  // Apply diversity to prevent consecutive same-creator posts
  const diversityStats = debugMode ? { diversitySwaps: 0 } : null;
  const diverseResult = applyDiversity(result, diversityStats).slice(0, limit);

  if (debugMode) {
    pipelineTimeline.push({ stage: 'diversity', durationMs: Date.now() - stageStart });
  }

  // Determine pagination
  // KNOWN TRADEOFF: Pagination drift under score reordering.
  // Same tradeoff as buildRecommendedFeed: the cursor advances chronologically
  // but results are score-reordered. Posts near the boundary that score below the
  // cutoff in one window are permanently skipped. This is an accepted tradeoff
  // for cursor-based feeds with post-fetch scoring -- the alternative requires
  // server-side scoring state or offset-based pagination.
  const hasNextPage = candidatePosts.length >= fetchLimit;
  let nextCursor = null;
  if (hasNextPage && diverseResult.length > 0) {
    const oldestCandidate = candidatePosts[candidatePosts.length - 1];
    nextCursor = oldestCandidate._id.toString();
  }

  const feedResult = { data: diverseResult, meta: { nextCursor, hasNextPage } };

  // Build debug info if requested
  if (debugMode) {
    const executionTimeMs = Date.now() - startTime;
    const fortyEightHoursAgoDebug = currentTime - (48 * 60 * 60 * 1000);

    const allScores = scoredPosts.map(s => s.score);
    const averageScore = allScores.length > 0
      ? allScores.reduce((sum, s) => sum + s, 0) / allScores.length
      : 0;

    const freshPostCount = diverseResult.filter(
      p => new Date(p.createdAt).getTime() >= fortyEightHoursAgoDebug
    ).length;

    // Build score breakdowns for each post in the final feed
    const scoreBreakdowns = diverseResult.map(post => {
      const postId = post._id.toString();
      const scored = scoredPosts.find(s => s.post._id.toString() === postId);
      const author = post.authorId;
      const authorUsername = (author && typeof author === 'object') ? author.username : '';

      const selectionReasons = [];
      if (new Date(post.createdAt).getTime() >= fortyEightHoursAgoDebug) {
        selectionReasons.push('Fresh Candidate');
      }
      // New creator check
      if (author && typeof author === 'object') {
        const accountAge = author.createdAt
          ? (currentTime - new Date(author.createdAt).getTime()) / (1000 * 60 * 60 * 24)
          : 999;
        const authorId = getAuthorIdString(post);
        const postCount = creatorPostCountMap.get(authorId) || 0;
        if (accountAge < 30 || postCount < 20) {
          selectionReasons.push('New Creator Boost');
        }
      }
      if (selectionReasons.length === 0) {
        selectionReasons.push('Score Ranked');
      }

      return {
        postId,
        caption: (post.caption || '').substring(0, 60),
        authorUsername,
        createdAt: post.createdAt,
        finalScore: scored ? scored.score : 0,
        signals: scored?.signalDetails || {},
        selectionReasons,
      };
    });

    feedResult.debug = {
      candidatesEvaluated: candidatePosts.length,
      executionTimeMs,
      averageScore: Math.round(averageScore * 100) / 100,
      freshPostCount,
      explorationPostCount: 0,
      diversitySwaps: diversityStats ? diversityStats.diversitySwaps : 0,
      pipelineTimeline,
      excludedPosts: buildExcludedPosts(scoredPosts, diverseResult, limit),
      scoreBreakdowns,
    };
  }

  return feedResult;
};
