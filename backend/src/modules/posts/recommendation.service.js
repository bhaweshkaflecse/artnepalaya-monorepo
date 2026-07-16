import { Post } from './post.model.js';
import { User } from '../users/user.model.js';
import { AppConfig } from '../admin/appConfig.model.js';
import { getInactiveUserIds } from '../../shared/utils/userFilters.js';

// Default recommendation weights - used when AppConfig has no stored value
const DEFAULT_WEIGHTS = {
  preferenceWeight: 0.8,
  discoveryWeight: 0.2,
  popularityLikeMultiplier: 3,
  popularitySaveMultiplier: 5,
  recencyBoostHours: 48,
};

/**
 * getUserFeedSignals - Aggregates user signals for feed personalization.
 * Currently uses interests; designed for extensibility with follow graph,
 * interaction history, etc.
 *
 * @param {string} userId - The authenticated user's ID
 * @returns {Object} Structured signals object
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
 * getRecommendationWeights - Fetches configurable recommendation weights from AppConfig.
 * Falls back to sensible defaults if no config entry exists.
 *
 * @returns {Object} Weights configuration
 */
export const getRecommendationWeights = async () => {
  const config = await AppConfig.findOne({ key: 'feed_recommendation_weights' }).lean();

  if (config && config.value) {
    return config.value;
  }

  return { ...DEFAULT_WEIGHTS };
};

/**
 * buildRecommendedFeed - Main recommendation function implementing 80/20 split
 * between preference-matched and discovery posts.
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

  // Step 3: Get recommendation weights
  const weights = await getRecommendationWeights();

  // Step 4: Build base query with safety filters
  const baseQuery = { deletedAt: null };

  // Exclude posts from banned/suspended users
  const inactiveIds = await getInactiveUserIds();
  baseQuery.authorId = { $nin: inactiveIds };

  // NSFW filtering
  const filterNsfw = !showMatureContent;
  if (filterNsfw) {
    baseQuery.isNsfw = { $ne: true };
  }

  // Apply cursor pagination
  if (cursor) {
    baseQuery._id = { $lt: cursor };
  }

  // Step 5: Fetch candidate posts.
  // Step 6: Use a single unified query with $or to fetch all candidate posts,
  // then split into preference/discovery pools in JavaScript.
  // This eliminates cursor drift because one query = one cursor boundary.
  const totalFetchLimit = limit * 2;

  const candidatePosts = await Post.find(baseQuery)
    .sort({ _id: -1 })
    .limit(totalFetchLimit)
    .populate('authorId', 'username avatarUrl role isVerified verifiedType')
    .lean();

  // Split candidates into preference-matched and discovery pools
  const interestSet = new Set(signals.interestSignals);
  const preferencePosts = [];
  const discoveryPosts = [];

  // Identify recent posts (within last 24 hours) - these always appear in the feed
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentBoostPosts = [];

  for (const post of candidatePosts) {
    const postCreatedAt = new Date(post.createdAt);
    const isRecent = postCreatedAt >= twentyFourHoursAgo;

    if (isRecent) {
      // Always include posts from the last 24 hours
      recentBoostPosts.push(post);
    } else {
      const postTypes = Array.isArray(post.artworkType) ? post.artworkType : [];
      const matchesPreference = postTypes.some(type => interestSet.has(type));
      if (matchesPreference) {
        preferencePosts.push(post);
      } else {
        discoveryPosts.push(post);
      }
    }
  }

  // Step 7: Apply popularity scoring using a Map (no mutation of lean documents)
  const scorePost = (post) => {
    let score = (post.likesCount || 0) * weights.popularityLikeMultiplier +
                (post.savesCount || 0) * weights.popularitySaveMultiplier;

    // Recency boost: posts within recencyBoostHours get a bonus
    const postAge = (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60);
    if (postAge <= weights.recencyBoostHours) {
      // Linear decay: full boost at 0 hours, no boost at recencyBoostHours
      const recencyFactor = 1 - (postAge / weights.recencyBoostHours);
      score += recencyFactor * 10; // 10-point max recency bonus
    }

    return score;
  };

  // Use Maps for scores instead of mutating post objects
  const preferenceScoreMap = new Map();
  for (const post of preferencePosts) {
    preferenceScoreMap.set(post._id.toString(), scorePost(post));
  }

  const discoveryScoreMap = new Map();
  for (const post of discoveryPosts) {
    discoveryScoreMap.set(post._id.toString(), scorePost(post));
  }

  // Sort using the maps
  preferencePosts.sort((a, b) => {
    return (preferenceScoreMap.get(b._id.toString()) || 0) -
           (preferenceScoreMap.get(a._id.toString()) || 0);
  });

  discoveryPosts.sort((a, b) => {
    return (discoveryScoreMap.get(b._id.toString()) || 0) -
           (discoveryScoreMap.get(a._id.toString()) || 0);
  });

  // Step 8: Score recent posts and sort by popularity (not just creation time)
  const recentScoreMap = new Map();
  for (const post of recentBoostPosts) {
    recentScoreMap.set(post._id.toString(), scorePost(post));
  }
  recentBoostPosts.sort((a, b) => {
    return (recentScoreMap.get(b._id.toString()) || 0) -
           (recentScoreMap.get(a._id.toString()) || 0);
  });

  // Cap recent posts to the page limit so they cannot overflow
  const cappedRecentPosts = recentBoostPosts.slice(0, limit);

  // Calculate remaining slots after recent posts
  const remainingSlots = Math.max(0, limit - cappedRecentPosts.length);
  const remainingPreferenceSlots = Math.ceil(remainingSlots * weights.preferenceWeight);
  const remainingDiscoverySlots = remainingSlots - remainingPreferenceSlots;

  const selectedPreference = preferencePosts.slice(0, remainingPreferenceSlots);
  const selectedDiscovery = discoveryPosts.slice(0, remainingDiscoverySlots);

  // Step 9: Combine: recent posts first, then preference, then discovery (capped to limit)
  const combined = [...cappedRecentPosts, ...selectedPreference, ...selectedDiscovery].slice(0, limit);

  // Step 10: Determine pagination cursor using actual slot sizes
  const hasNextPage = candidatePosts.length >= totalFetchLimit ||
    preferencePosts.length > remainingPreferenceSlots ||
    discoveryPosts.length > remainingDiscoverySlots ||
    recentBoostPosts.length > limit;

  let nextCursor = null;
  if (hasNextPage && combined.length > 0) {
    const oldestPost = combined.reduce((oldest, current) =>
      current._id < oldest._id ? current : oldest
    );
    nextCursor = oldestPost._id.toString();
  }

  return { data: combined, meta: { nextCursor, hasNextPage } };
};
