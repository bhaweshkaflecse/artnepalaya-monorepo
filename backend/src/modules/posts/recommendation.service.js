import { Post } from './post.model.js';
import { User } from '../users/user.model.js';
import { AppConfig } from '../admin/appConfig.model.js';

// Default recommendation weights - used when AppConfig has no stored value
const DEFAULT_WEIGHTS = {
  preferenceWeight: 0.8,
  discoveryWeight: 0.2,
  popularityLikeMultiplier: 3,
  popularitySaveMultiplier: 5,
  recencyBoostHours: 48,
};

// Helper: Get IDs of banned/suspended users for query-level filtering
const getInactiveUserIds = async () => {
  const users = await User.find({ status: { $in: ['banned', 'suspended'] } }).select('_id').lean();
  return users.map(u => u._id);
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

  // Step 5: Calculate slot distribution (80% preference, 20% discovery)
  const preferenceSlots = Math.ceil(limit * weights.preferenceWeight);
  const discoverySlots = limit - preferenceSlots;

  // Step 6: Fetch preference-matched posts (artworkType overlaps with user interests)
  const preferenceQuery = { ...baseQuery, artworkType: { $in: signals.interestSignals } };
  // Handle cursor in both queries - need to spread carefully if $lt exists
  if (cursor) {
    preferenceQuery._id = { $lt: cursor };
  }

  const preferencePosts = await Post.find(preferenceQuery)
    .sort({ _id: -1 })
    .limit(preferenceSlots * 2) // Fetch extra to allow scoring/sorting
    .populate('authorId', 'username avatarUrl role isVerified verifiedType')
    .lean();

  // Step 7: Fetch discovery posts (artworkType does NOT overlap with user interests)
  const discoveryQuery = { ...baseQuery };
  if (signals.interestSignals.length > 0) {
    discoveryQuery.artworkType = { $nin: signals.interestSignals };
  }
  if (cursor) {
    discoveryQuery._id = { $lt: cursor };
  }

  const discoveryPosts = await Post.find(discoveryQuery)
    .sort({ _id: -1 })
    .limit(discoverySlots * 2) // Fetch extra to allow scoring/sorting
    .populate('authorId', 'username avatarUrl role isVerified verifiedType')
    .lean();

  // Step 8: Apply popularity scoring using weights
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

  // Score and sort preference posts
  preferencePosts.forEach(post => { post._score = scorePost(post); });
  preferencePosts.sort((a, b) => b._score - a._score);

  // Score and sort discovery posts
  discoveryPosts.forEach(post => { post._score = scorePost(post); });
  discoveryPosts.sort((a, b) => b._score - a._score);

  // Step 9: Take the top posts from each category
  const selectedPreference = preferencePosts.slice(0, preferenceSlots);
  const selectedDiscovery = discoveryPosts.slice(0, discoverySlots);

  // Step 10: Combine and interleave (preference posts first, then discovery)
  const combined = [...selectedPreference, ...selectedDiscovery];

  // Remove internal scoring field
  combined.forEach(p => delete p._score);

  // Step 11: Determine pagination cursor
  const hasNextPage = preferencePosts.length > preferenceSlots || discoveryPosts.length > discoverySlots;

  let nextCursor = null;
  if (hasNextPage && combined.length > 0) {
    const oldestPost = combined.reduce((oldest, current) =>
      current._id < oldest._id ? current : oldest
    );
    nextCursor = oldestPost._id.toString();
  }

  return { data: combined, meta: { nextCursor, hasNextPage } };
};
