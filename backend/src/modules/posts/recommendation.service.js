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
// Built-in Signal Implementations
// ---------------------------------------------------------------------------

// Likes signal: raw like count
registerSignal('likes', (post) => {
  return post.likesCount || 0;
}, 3);

// Saves signal: raw save count (highest engagement weight)
registerSignal('saves', (post) => {
  return post.savesCount || 0;
}, 7);

// Comments signal: DORMANT - commentsCount field does not yet exist on Post schema.
// Will always return 0 until schema is extended. Registered for forward compatibility.
registerSignal('comments', (post) => {
  return post.commentsCount || 0;
}, 4);

// Shares signal: DORMANT - sharesCount field does not yet exist on Post schema.
// Will always return 0 until schema is extended. Registered for forward compatibility.
registerSignal('shares', (post) => {
  return post.sharesCount || 0;
}, 5);

// Views signal: DORMANT - viewsCount field does not yet exist on Post schema.
// Will always return 0 until schema is extended. Registered for forward compatibility.
registerSignal('views', (post) => {
  return post.viewsCount || 0;
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
 * @returns {Array} Re-ordered posts with diversity applied
 */
const applyDiversity = (posts) => {
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
  const user = await User.findById(userId).select('interests').lean();

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
    // Simple string hash for larger sets
    const joined = sortedIds.join(',');
    let hash = 0;
    for (let i = 0; i < joined.length; i++) {
      hash = ((hash << 5) - hash + joined.charCodeAt(i)) | 0;
    }
    keySegment = `h${Math.abs(hash).toString(36)}_n${sortedIds.length}`;
  }
  const cacheKey = `ranking:creatorQuality:${keySegment}`;

  const fetchQuality = async () => {
    const pipeline = [
      { $match: { authorId: { $in: authorIds.map(id => id) }, deletedAt: null } },
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
    const pipeline = [
      { $match: { authorId: { $in: authorIds.map(id => id) }, deletedAt: null } },
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
 * @returns {Object|null} Feed result { data, meta } or null for fallback
 */
export const buildRecommendedFeed = async (userId, cursor, limit, showMatureContent) => {
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
  const scoredPosts = candidatePosts.map(post => ({
    post,
    score: scorePost(post, context, weights),
  }));

  // Sort by score descending
  scoredPosts.sort((a, b) => b.score - a.score);

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

  // Step 11: Apply diversity to main candidates
  const diverseMainPosts = applyDiversity(mainCandidates).slice(0, mainSlotCount);

  // Step 12: Combine main + exploration, apply final diversity pass
  const combined = [...diverseMainPosts, ...explorationPosts].slice(0, limit);
  const finalFeed = applyDiversity(combined).slice(0, limit);

  // Step 13: Determine pagination
  const hasNextPage = candidatePosts.length >= fetchLimit;
  let nextCursor = null;
  if (hasNextPage && finalFeed.length > 0) {
    // Use the oldest _id from the original candidate set that was fetched
    const oldestCandidate = candidatePosts[candidatePosts.length - 1];
    nextCursor = oldestCandidate._id.toString();
  }

  return { data: finalFeed, meta: { nextCursor, hasNextPage } };
};

// ---------------------------------------------------------------------------
// Explore Feed Builder
// ---------------------------------------------------------------------------

/**
 * Build a ranked Explore feed with the following composition:
 *   ~70% trending (highest scored by engagement signals)
 *   ~20% established (from verified or high-follower creators)
 *   ~10% fresh (posts < 48 hours from newer creators with < 20 posts)
 *
 * @param {string|null} userId - Authenticated user's ID (nullable for guests)
 * @param {string|null} cursor - Pagination cursor
 * @param {number} limit - Number of posts to return
 * @param {boolean} showMatureContent - Whether to include NSFW posts
 * @param {string|null} artworkType - Optional artwork type filter
 * @returns {Object} { data, meta: { nextCursor, hasNextPage } }
 */
export const buildExploreFeed = async (userId, cursor, limit, showMatureContent, artworkType) => {
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

  const context = {
    seenCreatorIds: new Set(),
    userInterests: [],
    currentTime,
    creatorQualityMap,
    creatorPostCountMap,
    randomSeed: currentTime % 10000,
  };

  // Score all candidates
  const scoredPosts = candidatePosts.map(post => ({
    post,
    score: scorePost(post, context, weights),
  }));

  // Sort by score for trending pool
  scoredPosts.sort((a, b) => b.score - a.score);

  // Calculate slot distribution
  const trendingSlots = Math.ceil(limit * 0.7);
  const establishedSlots = Math.ceil(limit * 0.2);
  const freshSlots = Math.max(1, limit - trendingSlots - establishedSlots);

  // Pool 1: Trending (top scored)
  const trendingPool = scoredPosts.slice(0, trendingSlots * 2);

  // Pool 2: Established creators (verified or high followers)
  const establishedPool = scoredPosts.filter(s => {
    const author = s.post.authorId;
    if (!author || typeof author !== 'object') return false;
    return author.isVerified || (author.stats?.followers || 0) >= 50;
  });

  // Pool 3: Fresh uploads (< 48 hours, from creators with < 20 posts)
  const fortyEightHoursAgo = currentTime - (48 * 60 * 60 * 1000);
  const freshPool = scoredPosts.filter(s => {
    const postTime = new Date(s.post.createdAt).getTime();
    if (postTime < fortyEightHoursAgo) return false;
    const authorId = getAuthorIdString(s.post);
    const postCount = creatorPostCountMap.get(authorId) || 0;
    return postCount < 20;
  });

  // Select from each pool, avoiding duplicates
  const selectedIds = new Set();
  const result = [];

  // Fill trending slots
  for (const s of trendingPool) {
    if (result.length >= trendingSlots) break;
    const id = s.post._id.toString();
    if (!selectedIds.has(id)) {
      selectedIds.add(id);
      result.push(s.post);
    }
  }

  // Fill established slots
  for (const s of establishedPool) {
    if (result.length >= trendingSlots + establishedSlots) break;
    const id = s.post._id.toString();
    if (!selectedIds.has(id)) {
      selectedIds.add(id);
      result.push(s.post);
    }
  }

  // Fill fresh slots
  for (const s of freshPool) {
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
  const diverseResult = applyDiversity(result).slice(0, limit);

  // Determine pagination
  const hasNextPage = candidatePosts.length >= fetchLimit;
  let nextCursor = null;
  if (hasNextPage && diverseResult.length > 0) {
    const oldestCandidate = candidatePosts[candidatePosts.length - 1];
    nextCursor = oldestCandidate._id.toString();
  }

  return { data: diverseResult, meta: { nextCursor, hasNextPage } };
};
