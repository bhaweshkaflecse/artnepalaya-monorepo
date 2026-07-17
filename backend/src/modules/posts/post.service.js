import { v2 as cloudinary } from 'cloudinary';
import { Post } from './post.model.js';
import { Like, Save } from './post-interaction.model.js';
import { Notification } from '../notifications/notification.model.js';
import { FeaturedPost } from '../admin/featured.model.js';
import { Report } from '../reports/report.model.js';
import * as tagService from '../tags/tag.service.js';
import * as notificationService from '../notifications/notification.service.js';
import { emitToFeed } from '../../realtime/emitter.js';
import { EVENTS } from '../../realtime/events.js';
import { buildRecommendedFeed, buildExploreFeed } from './recommendation.service.js';

// THE FIX: Using our new functional cache imports!
import { getOrSetCache, invalidateCache } from '../../shared/utils/cache.js';
import { getInactiveUserIds } from '../../shared/utils/userFilters.js';

export const createPost = async (userId, postData) => {
  // BULLETPROOF TAGS FIX: Handle both Strings (from form-data) and Arrays
  if (postData.tags) {
    let tagsArray = [];
    
    if (typeof postData.tags === 'string') {
      try {
        // Try to parse the string '["art", "nepal"]' into a real array
        tagsArray = JSON.parse(postData.tags);
      } catch (e) {
        // Fallback: if it's just "art", wrap it in an array
        tagsArray = [postData.tags];
      }
    } else if (Array.isArray(postData.tags)) {
      tagsArray = postData.tags;
    }

    // Now it is guaranteed to be an array, so .map() will never crash
    postData.tags = tagsArray.map(t => t.toLowerCase().trim());
  }

  // BULLETPROOF ARTWORKTYPE FIX: Handle both Strings (from form-data) and Arrays
  console.log('[CREATE_POST] postData.artworkType BEFORE parsing:', JSON.stringify(postData.artworkType), '| typeof:', typeof postData.artworkType, '| isArray:', Array.isArray(postData.artworkType));
  if (postData.artworkType) {
    let artworkTypeArray = [];

    if (typeof postData.artworkType === 'string') {
      try {
        // Try to parse the string '["Digital Art"]' into a real array
        artworkTypeArray = JSON.parse(postData.artworkType);
      } catch (e) {
        // Fallback: if it's just "Digital Art", wrap it in an array
        artworkTypeArray = [postData.artworkType];
      }
    } else if (Array.isArray(postData.artworkType)) {
      artworkTypeArray = postData.artworkType;
    }

    // Ensure it's always an array
    if (!Array.isArray(artworkTypeArray)) {
      artworkTypeArray = [artworkTypeArray];
    }

    postData.artworkType = artworkTypeArray;
  }

  // Automatic AI tag enforcement: if post is AI-generated, ensure "ai" tag exists and set backward compat
  if (postData.isAIGenerated === true || postData.isAIGenerated === 'true') {
    if (!postData.tags) {
      postData.tags = [];
    }
    if (!postData.tags.includes('ai')) {
      postData.tags.push('ai');
    }
    postData.isHumanMade = false;
  } else if (!postData.isAIGenerated || postData.isAIGenerated === false || postData.isAIGenerated === 'false') {
    // If not AI-generated, set isHumanMade = true for backward compat
    if (postData.isHumanMade === undefined) {
      postData.isHumanMade = true;
    }
  }

  // Legacy fallback: if isHumanMade is explicitly false (old clients), ensure "ai" tag exists
  if (postData.isHumanMade === false || postData.isHumanMade === 'false') {
    if (!postData.tags) {
      postData.tags = [];
    }
    if (!postData.tags.includes('ai')) {
      postData.tags.push('ai');
    }
  }

  const post = await Post.create({ authorId: userId, ...postData });
  console.log('[CREATE_POST] Saved to MongoDB. media count:', post.media?.length);

  // Populate author data before returning
  const populatedPost = await post.populate('authorId', 'username avatarUrl role isVerified verifiedType fullName status');

  // Invalidate all feed caches after successful post creation
  invalidateCache('feed:*').catch(err => console.error('Feed cache invalidation failed:', err));

  // Emit realtime event
  emitToFeed(EVENTS.POST_CREATED, { postId: populatedPost._id.toString(), authorId: userId });

  // Trigger Tags (Fire and forget)
  if (populatedPost.tags && populatedPost.tags.length > 0) {
    tagService.incrementTags(populatedPost.tags).catch(err => console.error('Tag increment failed:', err));
  }
  
  return populatedPost;
};

export const getSinglePost = async (postId, userId, showMatureContent = false) => {
  const post = await Post.findById(postId).populate('authorId', 'username avatarUrl role isVerified verifiedType status').lean();
  if (!post) throw Object.assign(new Error('Post not found'), { status: 404 });

  // Hide soft-deleted posts
  if (post.deletedAt) {
    throw Object.assign(new Error('Post not found'), { status: 404 });
  }

  // Hide posts from banned/suspended authors
  if (post.authorId && (post.authorId.status === 'banned' || post.authorId.status === 'suspended')) {
    throw Object.assign(new Error('Post not found'), { status: 404 });
  }

  // NSFW Protection: Block access if post is NSFW and viewer hasn't opted in (author always allowed)
  const isAuthor = userId && post.authorId && post.authorId._id.toString() === userId.toString();
  if (post.isNsfw && !showMatureContent && !isAuthor) {
    throw Object.assign(new Error('This content is marked as mature. Enable mature content in settings to view.'), { status: 403 });
  }

  // Hydrate like/save state for authenticated user
  if (userId) {
    const [liked, saved] = await Promise.all([
      Like.exists({ userId, postId: post._id }),
      Save.exists({ userId, postId: post._id }),
    ]);
    post.isLikedByMe = !!liked;
    post.isSavedByMe = !!saved;
  } else {
    post.isLikedByMe = false;
    post.isSavedByMe = false;
  }

  return post;
};

export const getFeed = async (userId, cursor, limit, showMatureContent) => {
  limit = limit || 15;

  // Recommendation engine: attempt personalized feed for authenticated users with interests
  if (userId) {
    console.log('[getFeed] Authenticated user:', userId, '- attempting recommendation engine');
    try {
      const recommendedFeed = await buildRecommendedFeed(userId, cursor, limit, showMatureContent);
      if (recommendedFeed !== null) {
        console.log('[getFeed] Recommendation engine returned', recommendedFeed.data.length, 'posts');
        // Per-user like/save hydration for recommended feed
        if (recommendedFeed.data.length > 0) {
          const postIds = recommendedFeed.data.map(p => p._id);
          const [likes, saves] = await Promise.all([
            Like.find({ userId, postId: { $in: postIds } }).select('postId').lean(),
            Save.find({ userId, postId: { $in: postIds } }).select('postId').lean(),
          ]);
          const likedSet = new Set(likes.map(l => l.postId.toString()));
          const savedSet = new Set(saves.map(s => s.postId.toString()));

          recommendedFeed.data.forEach(post => {
            post.isLikedByMe = likedSet.has(post._id.toString());
            post.isSavedByMe = savedSet.has(post._id.toString());
          });
        } else {
          recommendedFeed.data.forEach(post => {
            post.isLikedByMe = false;
            post.isSavedByMe = false;
          });
        }
        return recommendedFeed;
      }
    } catch (err) {
      // Graceful fallback: if recommendation engine fails, continue to existing algorithm
      console.error('Recommendation engine error, falling back to default feed:', err.message);
    }
    console.log('[getFeed] Recommendation returned null (user has no interests) - using LEGACY fallback');
  } else {
    console.log('[getFeed] Guest/unauthenticated - using LEGACY fallback');
  }

  // Determine if NSFW content should be filtered
  const filterNsfw = !userId || !showMatureContent;

  // Cache stores base posts without per-user state
  const nsfwKey = filterNsfw ? 'safe' : 'all';
  const cacheKey = `feed:ranked:${nsfwKey}:${cursor || 'start'}:${limit}`;

  // Feed query builder (shared between cached and uncached paths)
  const buildFeedQuery = async () => {
    const query = cursor ? { _id: { $lt: cursor } } : {};

    // Exclude soft-deleted posts
    query.deletedAt = null;

    // Exclude posts from banned/suspended users
    const inactiveIds = await getInactiveUserIds();
    query.authorId = { $nin: inactiveIds };

    // NSFW Protection: Exclude NSFW posts for guests and users without mature content opt-in
    if (filterNsfw) {
      query.isNsfw = { $ne: true };
    }

    const fetchLimit = limit * 2;

    let posts = await Post.find(query)
      .sort({ _id: -1 })
      .limit(fetchLimit)
      .populate('authorId', 'username avatarUrl role isVerified verifiedType')
      .lean();

    // Popularity scoring: likesCount * 3 + savesCount * 5
    posts.forEach(post => {
      post._score = (post.likesCount || 0) * 3 + (post.savesCount || 0) * 5;
    });

    // Split into popular (sorted by score DESC, then createdAt DESC) and recent (createdAt DESC)
    const popular = [...posts].sort((a, b) => {
      if (b._score !== a._score) return b._score - a._score;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const recent = [...posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Interleave: first batch = top scored, rest = recent (filling up to limit)
    const firstBatchSize = Math.ceil(limit / 3);
    const topScored = popular.slice(0, firstBatchSize);
    const topScoredIds = new Set(topScored.map(p => p._id.toString()));

    const recentFill = recent.filter(p => !topScoredIds.has(p._id.toString()));
    const remainingSlots = limit - topScored.length;
    const recentPosts = recentFill.slice(0, remainingSlots);

    const paginatedPosts = [...topScored, ...recentPosts];
    const hasNextPage = posts.length > limit;

    let nextCursor = null;
    if (hasNextPage && paginatedPosts.length > 0) {
      const oldestPost = paginatedPosts.reduce((oldest, current) => current._id < oldest._id ? current : oldest);
      nextCursor = oldestPost._id.toString();
    }

    paginatedPosts.forEach(p => delete p._score);
    return { data: paginatedPosts, meta: { nextCursor, hasNextPage } };
  };

  let baseFeed;
  if (!cursor) {
    // First page (pull-to-refresh or initial load): always query fresh from DB
    // so newly created posts appear immediately without waiting for cache expiry
    console.log('[getFeed] First page request - querying fresh (no cache)');
    baseFeed = await buildFeedQuery();
  } else {
    // Pagination pages: use cache for performance
    console.log('[getFeed] Pagination request - using cache, key:', cacheKey);
    baseFeed = await getOrSetCache(cacheKey, 60, buildFeedQuery);
  }

  // Per-user like/save hydration (not cached)
  if (userId && baseFeed.data.length > 0) {
    const postIds = baseFeed.data.map(p => p._id);
    const [likes, saves] = await Promise.all([
      Like.find({ userId, postId: { $in: postIds } }).select('postId').lean(),
      Save.find({ userId, postId: { $in: postIds } }).select('postId').lean(),
    ]);
    const likedSet = new Set(likes.map(l => l.postId.toString()));
    const savedSet = new Set(saves.map(s => s.postId.toString()));

    baseFeed.data.forEach(post => {
      post.isLikedByMe = likedSet.has(post._id.toString());
      post.isSavedByMe = savedSet.has(post._id.toString());
    });
  } else {
    baseFeed.data.forEach(post => {
      post.isLikedByMe = false;
      post.isSavedByMe = false;
    });
  }

  return baseFeed;
};

export const getExplore = async (userId, cursor, limit, artworkType, search, showMatureContent) => {
  limit = limit || 20;

  // When no search query is active, use the ranked explore feed (supports artworkType filter)
  if (!search) {
    try {
      const rankedFeed = await buildExploreFeed(userId, cursor, limit, !!showMatureContent, artworkType || null);
      if (rankedFeed && rankedFeed.data.length > 0) {
        // Per-user hydration for ranked feed
        if (userId && rankedFeed.data.length > 0) {
          const postIds = rankedFeed.data.map(p => p._id);
          const [likes, saves] = await Promise.all([
            Like.find({ userId, postId: { $in: postIds } }).select('postId').lean(),
            Save.find({ userId, postId: { $in: postIds } }).select('postId').lean(),
          ]);
          const likedSet = new Set(likes.map(l => l.postId.toString()));
          const savedSet = new Set(saves.map(s => s.postId.toString()));
          rankedFeed.data.forEach(post => {
            post.isLikedByMe = likedSet.has(post._id.toString());
            post.isSavedByMe = savedSet.has(post._id.toString());
          });
        } else {
          rankedFeed.data.forEach(post => {
            post.isLikedByMe = false;
            post.isSavedByMe = false;
          });
        }
        return rankedFeed;
      }
    } catch (err) {
      console.error('[getExplore] Ranked explore feed error, falling back to latest-first:', err.message);
    }
  }

  // Fallback: existing latest-first logic for search/filter queries or when ranked feed is empty
  const query = {};

  // Cursor-based pagination
  if (cursor) {
    query._id = { $lt: cursor };
  }

  // Exclude soft-deleted
  query.deletedAt = null;

  // Exclude banned/suspended users
  const inactiveIds = await getInactiveUserIds();
  if (inactiveIds.length > 0) {
    query.authorId = { $nin: inactiveIds };
  }

  // NSFW filter
  if (!userId || !showMatureContent) {
    query.isNsfw = { $ne: true };
  }

  // Artwork type filter (case-insensitive exact match, escape regex metacharacters)
  if (artworkType) {
    const escapedType = artworkType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.artworkType = { $regex: `^${escapedType}$`, $options: 'i' };
  }

  // Text search on caption, tags (escape regex metacharacters to prevent injection)
  if (search) {
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(escapedSearch, 'i');
    query.$or = [
      { caption: searchRegex },
      { tags: searchRegex }
    ];
  }

  // Log the COMPLETE final query immediately before execution (all filters applied)
  console.log('[getExplore] Final Mongo Query:', JSON.stringify(query));

  const posts = await Post.find(query)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .populate('authorId', 'username avatarUrl role isVerified verifiedType')
    .lean();

  console.log('[getExplore] Results count:', posts.length);
  if (posts.length > 0) {
    console.log('[getExplore] Returned IDs:', posts.slice(0, 5).map(p => p._id));
  }

  // If no results found with filter, debug what's actually in the database
  if (posts.length === 0 && artworkType) {
    const samples = await Post.find({ deletedAt: null })
      .select('_id caption artworkType createdAt')
      .populate('authorId', 'username')
      .sort({ _id: -1 })
      .limit(5)
      .lean();
    console.log('[getExplore] Sample documents (latest 5):');
    samples.forEach((s, i) => {
      console.log(`  [${i}] _id=${s._id}, createdAt=${s.createdAt}, author=${s.authorId?.username || 'unknown'}, artworkType=${JSON.stringify(s.artworkType)}, isArray=${Array.isArray(s.artworkType)}`);
    });
    
    // Try a simple equality match to compare
    const equalityCount = await Post.countDocuments({ 
      deletedAt: null, 
      artworkType: artworkType 
    });
    console.log('[getExplore] Direct equality match count:', equalityCount);
    
    // Try case-insensitive with $in without anchors
    const regexCount = await Post.countDocuments({ 
      deletedAt: null, 
      artworkType: { $regex: artworkType, $options: 'i' } 
    });
    console.log('[getExplore] Regex match (no anchors) count:', regexCount);
  }

  const hasNextPage = posts.length > limit;
  const paginatedPosts = hasNextPage ? posts.slice(0, limit) : posts;
  const nextCursor = hasNextPage && paginatedPosts.length > 0
    ? paginatedPosts[paginatedPosts.length - 1]._id.toString()
    : null;

  // Per-user hydration
  if (userId && paginatedPosts.length > 0) {
    const postIds = paginatedPosts.map(p => p._id);
    const [likes, saves] = await Promise.all([
      Like.find({ userId, postId: { $in: postIds } }).select('postId').lean(),
      Save.find({ userId, postId: { $in: postIds } }).select('postId').lean(),
    ]);
    const likedSet = new Set(likes.map(l => l.postId.toString()));
    const savedSet = new Set(saves.map(s => s.postId.toString()));
    paginatedPosts.forEach(post => {
      post.isLikedByMe = likedSet.has(post._id.toString());
      post.isSavedByMe = savedSet.has(post._id.toString());
    });
  } else {
    paginatedPosts.forEach(post => {
      post.isLikedByMe = false;
      post.isSavedByMe = false;
    });
  }

  return { data: paginatedPosts, meta: { nextCursor, hasNextPage } };
};

// === QUERIES ===
export const getPostLikes = async (postId) => {
  const likes = await Like.find({ postId })
    .populate('userId', 'username avatarUrl fullName')
    .sort({ createdAt: -1 })
    .lean();

  return likes.map(like => like.userId);
};

// === INTERACTIONS ===
export const addLike = async (userId, postId) => {
  try {
    await Like.create({ userId, postId });
    const post = await Post.findByIdAndUpdate(postId, { $inc: { likesCount: 1 } });
    if (!post) throw Object.assign(new Error('Post not found'), { status: 404 });
    
    notificationService.createNotification({
      recipientId: post.authorId, senderId: userId, postId: post._id, type: 'Like'
    }).catch(console.error);
    
    return true;
  } catch (err) {
    if (err.code === 11000) return true; 
    throw err;
  }
};

export const removeLike = async (userId, postId) => {
  const deletedLike = await Like.findOneAndDelete({ userId, postId });
  if (deletedLike) await Post.updateOne({ _id: postId }, { $inc: { likesCount: -1 } });
  return true;
};

export const addSave = async (userId, postId) => {
  try {
    await Save.create({ userId, postId });
    const post = await Post.findByIdAndUpdate(postId, { $inc: { savesCount: 1 } });
    if (!post) throw Object.assign(new Error('Post not found'), { status: 404 });
    
    notificationService.createNotification({
      recipientId: post.authorId, senderId: userId, postId: post._id, type: 'Save'
    }).catch(console.error);

    return true;
  } catch (err) {
    if (err.code === 11000) return true; 
    throw err;
  }
};

export const removeSave = async (userId, postId) => {
  const deletedSave = await Save.findOneAndDelete({ userId, postId });
  if (deletedSave) await Post.updateOne({ _id: postId }, { $inc: { savesCount: -1 } });
  return true;
};

// === CREATOR MANAGEMENT ===
export const updatePost = async (postId, userId, userRole, updateData) => {
  const post = await Post.findById(postId);
  if (!post) throw Object.assign(new Error('Post not found'), { status: 404 });

  if (post.authorId.toString() !== userId && userRole !== 'Admin') {
    throw Object.assign(new Error('You do not have permission to edit this post'), { status: 403 });
  }

  // Only allow updating these fields
  const allowedFields = {};

  if (updateData.caption !== undefined) {
    allowedFields.caption = updateData.caption;
  }

  if (updateData.tags !== undefined) {
    let tagsArray = [];
    if (typeof updateData.tags === 'string') {
      try {
        tagsArray = JSON.parse(updateData.tags);
      } catch (e) {
        tagsArray = [updateData.tags];
      }
    } else if (Array.isArray(updateData.tags)) {
      tagsArray = updateData.tags;
    }
    allowedFields.tags = tagsArray.map(t => t.toLowerCase().trim());
  }

  if (updateData.isHumanMade !== undefined) {
    allowedFields.isHumanMade = updateData.isHumanMade;
  }

  if (updateData.isOriginalContent !== undefined) {
    allowedFields.isOriginalContent = updateData.isOriginalContent;
  }

  if (updateData.isAIGenerated !== undefined) {
    allowedFields.isAIGenerated = updateData.isAIGenerated;
  }

  // AI tag enforcement on update: mirror createPost logic
  if (allowedFields.isAIGenerated === true || allowedFields.isAIGenerated === 'true') {
    // Ensure tags array includes "ai"
    if (!allowedFields.tags) {
      // Start from existing post tags if user didn't provide new tags
      allowedFields.tags = Array.isArray(post.tags) ? [...post.tags] : [];
    }
    if (!allowedFields.tags.includes('ai')) {
      allowedFields.tags.push('ai');
    }
    allowedFields.isHumanMade = false;
  } else if (allowedFields.isAIGenerated === false || allowedFields.isAIGenerated === 'false') {
    allowedFields.isHumanMade = true;
  }

  if (updateData.isNsfw !== undefined) {
    allowedFields.isNsfw = updateData.isNsfw;
  }

  if (updateData.artworkType !== undefined) {
    let artworkTypeArray = [];

    if (typeof updateData.artworkType === 'string') {
      try {
        artworkTypeArray = JSON.parse(updateData.artworkType);
      } catch (e) {
        artworkTypeArray = [updateData.artworkType];
      }
    } else if (Array.isArray(updateData.artworkType)) {
      artworkTypeArray = updateData.artworkType;
    }

    // Ensure it's always an array
    if (!Array.isArray(artworkTypeArray)) {
      artworkTypeArray = [artworkTypeArray];
    }

    allowedFields.artworkType = artworkTypeArray;
  }

  const updatedPost = await Post.findByIdAndUpdate(postId, { $set: allowedFields }, { new: true });

  // Emit realtime event
  emitToFeed(EVENTS.POST_UPDATED, { postId, data: allowedFields });

  invalidateCache('feed:*').catch(err => console.error('Feed cache invalidation failed:', err));

  return updatedPost;
};

export const deletePost = async (postId, userId, userRole) => {
  const post = await Post.findById(postId);
  if (!post) throw Object.assign(new Error('Post not found'), { status: 404 });

  if (post.authorId.toString() !== userId && userRole !== 'Admin') {
    throw Object.assign(new Error('You do not have permission to delete this post'), { status: 403 });
  }

  // Soft delete: set deletedAt timestamp instead of removing
  await Post.findByIdAndUpdate(postId, { $set: { deletedAt: new Date() } });

  // Emit realtime event
  emitToFeed(EVENTS.POST_DELETED, { postId });

  invalidateCache('feed:*').catch(err => console.error('Feed cache invalidation failed:', err));

  return true;
};