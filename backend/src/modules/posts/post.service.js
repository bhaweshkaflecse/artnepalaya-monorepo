import { v2 as cloudinary } from 'cloudinary';
import { Post } from './post.model.js';
import { Like, Save } from './post-interaction.model.js';
import { Notification } from '../notifications/notification.model.js';
import { FeaturedPost } from '../admin/featured.model.js';
import { Report } from '../reports/report.model.js';
import * as tagService from '../tags/tag.service.js';
import * as notificationService from '../notifications/notification.service.js';

// THE FIX: Using our new functional cache imports!
import { getOrSetCache, invalidateCache } from '../../shared/utils/cache.js'; 

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

  const post = await Post.create({ authorId: userId, ...postData });

  // Invalidate all feed caches after successful post creation
  invalidateCache('feed:*').catch(err => console.error('Feed cache invalidation failed:', err));

  // Trigger Tags (Fire and forget)
  if (post.tags && post.tags.length > 0) {
    tagService.incrementTags(post.tags).catch(err => console.error('Tag increment failed:', err));
  }
  
  return post;
};

export const getSinglePost = async (postId, userId, showMatureContent = false) => {
  const post = await Post.findById(postId).populate('authorId', 'username avatarUrl role isVerified verifiedType').lean();
  if (!post) throw Object.assign(new Error('Post not found'), { status: 404 });

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

  // Determine if NSFW content should be filtered
  const filterNsfw = !userId || !showMatureContent;

  // Cache stores base posts without per-user state
  const nsfwKey = filterNsfw ? 'safe' : 'all';
  const cacheKey = `feed:ranked:${nsfwKey}:${cursor || 'start'}:${limit}`;

  const baseFeed = await getOrSetCache(cacheKey, 300, async () => {
    const query = cursor ? { _id: { $lt: cursor } } : {};

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
  });

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

  if (updateData.isNsfw !== undefined) {
    allowedFields.isNsfw = updateData.isNsfw;
  }

  if (updateData.artworkType !== undefined) {
    allowedFields.artworkType = updateData.artworkType;
  }

  const updatedPost = await Post.findByIdAndUpdate(postId, { $set: allowedFields }, { new: true });

  invalidateCache('feed:*').catch(err => console.error('Feed cache invalidation failed:', err));

  return updatedPost;
};

export const deletePost = async (postId, userId, userRole) => {
  const post = await Post.findById(postId);
  if (!post) throw Object.assign(new Error('Post not found'), { status: 404 });

  if (post.authorId.toString() !== userId && userRole !== 'Admin') {
    throw Object.assign(new Error('You do not have permission to delete this post'), { status: 403 });
  }

  // Clean up Cloudinary assets
  const destroyPromises = post.media.map(m =>
    cloudinary.uploader.destroy(m.providerId, { resource_type: m.type === 'video' ? 'video' : 'image' }).catch(err => console.error('Cloudinary destroy failed:', err))
  );
  await Promise.all(destroyPromises);

  await Promise.all([
    Post.findByIdAndDelete(postId),
    Like.deleteMany({ postId }),
    Save.deleteMany({ postId }),
    Notification.deleteMany({ postId }),
    FeaturedPost.findOneAndDelete({ postId }),
    Report.deleteMany({ targetId: postId }),
  ]);

  invalidateCache('feed:*').catch(err => console.error('Feed cache invalidation failed:', err));

  return true;
};