import { Post } from './post.model.js';
import { Like, Save } from './post-interaction.model.js';
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

  // Trigger Tags (Fire and forget)
  if (post.tags && post.tags.length > 0) {
    tagService.incrementTags(post.tags).catch(err => console.error('Tag increment failed:', err));
  }
  
  return post;
};

export const getSinglePost = async (postId) => {
  const post = await Post.findById(postId).populate('authorId', 'username avatarUrl role').lean();
  if (!post) throw Object.assign(new Error('Post not found'), { status: 404 });
  return post;
};

export const getFeed = async (userId, cursor, limit) => {
  limit = limit || 15;

  const cacheKey = `feed:ranked:${userId || 'guest'}:${cursor || 'start'}:${limit}`;

  return await getOrSetCache(cacheKey, 300, async () => {
    const query = cursor ? { _id: { $lt: cursor } } : {};
    const fetchLimit = limit * 2;

    let posts = await Post.find(query)
      .sort({ _id: -1 })
      .limit(fetchLimit)
      .populate('authorId', 'username avatarUrl role')
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