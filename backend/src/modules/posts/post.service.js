import { Post } from './post.model.js';
import { User } from '../users/user.model.js';
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

  let userInterests = [];
  if (userId) {
    const user = await User.findById(userId).select('interests').lean();
    userInterests = user?.interests || [];
  }
  
  // THE UPGRADE: Caching the feed using Redis! (Caches for 5 minutes)
  const cacheKey = `feed:${userId || 'guest'}:${cursor || 'start'}:${limit}`;
  
  return await getOrSetCache(cacheKey, 300, async () => {
    const query = cursor ? { _id: { $lt: cursor } } : {};
    const fetchLimit = limit * 2; 

    let posts = await Post.find(query)
      .sort({ _id: -1 })
      .limit(fetchLimit)
      .populate('authorId', 'username avatarUrl role')
      .lean();

    // Redis Feed Algorithm (Interest Scoring)
    if (userInterests.length > 0) {
      posts.forEach(post => {
        post._score = post.tags.filter(tag => userInterests.includes(tag)).length * 2;
      });
      posts.sort((a, b) => b._score !== a._score ? b._score - a._score : (b._id > a._id ? 1 : -1));
    }

    const paginatedPosts = posts.slice(0, limit);
    const hasNextPage = posts.length > limit;
    
    let nextCursor = null;
    if (hasNextPage) {
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