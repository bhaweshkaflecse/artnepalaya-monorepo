import mongoose from 'mongoose';
import { User } from './user.model.js';
import { Post } from '../posts/post.model.js';
import { Like, Save } from '../posts/post-interaction.model.js';
import { Follow } from './follow.model.js';
import * as notificationService from '../notifications/notification.service.js';
import { emitToUser } from '../../realtime/emitter.js';
import { EVENTS } from '../../realtime/events.js';

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// === Unified Identifier Resolver ===
// Resolves a user identifier (ObjectId string or username) to a MongoDB ObjectId string.
// Returns null if no user is found.
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

export const resolveUserId = async (identifier) => {
  if (!identifier) return null;

  if (isValidObjectId(identifier)) {
    // Verify the user actually exists
    const user = await User.findById(identifier).select('_id').lean();
    return user ? user._id.toString() : null;
  }

  // Treat as username - case-insensitive lookup
  const safeUsername = identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const user = await User.findOne({ username: { $regex: new RegExp(`^${safeUsername}$`, 'i') } }).select('_id').lean();
  return user ? user._id.toString() : null;
};

// === Fetch Profile ===
export const getUserProfile = async (userId, isPublic = false) => {
  // Notice we removed .populate('interests') since they are now strings!
  const user = await User.findById(userId).lean();
  
  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  if (isPublic) {
    // Strip sensitive information for public viewing
    delete user.email;
    delete user.phoneNumber;
    delete user.dob;
    delete user.googleId;
  }
  
  return user;
};

// === Fetch Profile by Username ===
export const getUserProfileByUsername = async (username, isPublic = false) => {
  const user = await User.findOne({ username: { $regex: new RegExp(`^${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }).lean();

  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  if (isPublic) {
    delete user.email;
    delete user.phoneNumber;
    delete user.dob;
    delete user.googleId;
  }

  return user;
};

// === Update Profile ===
export const updateUserProfile = async (userId, updateData) => {
  // We use findById + save() instead of findByIdAndUpdate so your pre('save') hook runs!
  const user = await User.findById(userId);
  
  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  // Username change validation: uniqueness check + 7-day cooldown
  if (updateData.username && updateData.username !== user.username) {
    // Check 7-day cooldown - only enforce if user already has a username set
    if (user.username && user.usernameChangedAt) {
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const timeSinceLastChange = Date.now() - new Date(user.usernameChangedAt).getTime();
      if (timeSinceLastChange < sevenDaysMs) {
        const daysRemaining = Math.ceil((sevenDaysMs - timeSinceLastChange) / (24 * 60 * 60 * 1000));
        throw Object.assign(
          new Error(`You can only change your username once every 7 days. Please wait ${daysRemaining} more day${daysRemaining === 1 ? '' : 's'}.`),
          { status: 400 }
        );
      }
    }

    // Check uniqueness before attempting save
    const existingUser = await User.findOne({ username: updateData.username, _id: { $ne: userId } }).lean();
    if (existingUser) {
      throw Object.assign(
        new Error('This username is already taken. Please choose a different one.'),
        { status: 409 }
      );
    }
  }

  // Define exactly what the user is allowed to change (mapped to our Zod schema)
  const allowedUpdates = ['username', 'fullName', 'avatarUrl', 'dob', 'role', 'subRoles', 'interests', 'bio', 'location', 'website', 'whatsapp', 'contactPhone', 'nsfwBlurEnabled', 'showMatureContent'];
  
  // Track if username is actually changing
  const isUsernameChanging = updateData.username && updateData.username !== user.username;

  allowedUpdates.forEach((field) => {
    if (updateData[field] !== undefined) {
      user[field] = updateData[field];
    }
  });

  // Set usernameChangedAt timestamp if username was changed
  if (isUsernameChanging) {
    user.usernameChangedAt = new Date();
  }

  // This save triggers the DOB to age calculation in user.model.js!
  try {
    await user.save();
  } catch (err) {
    // Handle MongoDB duplicate key error (TOCTOU race on username)
    if (err.code === 11000) {
      const keyPattern = err.keyPattern || {};
      if (keyPattern.username) {
        throw Object.assign(
          new Error('This username is already taken. Please choose a different one.'),
          { status: 409 }
        );
      }
    }
    throw err;
  }
  
  return user.toObject(); // Convert to plain object for the API response
};

// === Fetch User Posts (Offset Pagination) ===
export const getUserPosts = async (userId, page, limit, viewerId) => {
  // Check if target user is banned/suspended - return empty results if so
  const targetUser = await User.findById(userId).select('status').lean();
  if (!targetUser || targetUser.status === 'banned' || targetUser.status === 'suspended') {
    return { data: [], meta: { currentPage: page, limit, totalItems: 0, totalPages: 0, hasNextPage: false } };
  }

  const skip = (page - 1) * limit;

  const [posts, totalItems] = await Promise.all([
    Post.find({ authorId: userId, deletedAt: null })
      .sort({ createdAt: -1 }) // Newest first
      .skip(skip)
      .limit(limit)
      .populate('authorId', 'username avatarUrl role isVerified verifiedType')
      .lean(),
    Post.countDocuments({ authorId: userId, deletedAt: null })
  ]);

  // Hydrate like/save state for authenticated viewer
  if (viewerId && posts.length > 0) {
    const postIds = posts.map(p => p._id);
    const [likes, saves] = await Promise.all([
      Like.find({ userId: viewerId, postId: { $in: postIds } }).select('postId').lean(),
      Save.find({ userId: viewerId, postId: { $in: postIds } }).select('postId').lean(),
    ]);
    const likedSet = new Set(likes.map(l => l.postId.toString()));
    const savedSet = new Set(saves.map(s => s.postId.toString()));

    posts.forEach(post => {
      post.isLikedByMe = likedSet.has(post._id.toString());
      post.isSavedByMe = savedSet.has(post._id.toString());
    });
  } else {
    posts.forEach(post => {
      post.isLikedByMe = false;
      post.isSavedByMe = false;
    });
  }

  const totalPages = Math.ceil(totalItems / limit);

  return {
    data: posts,
    meta: {
      currentPage: page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages
    }
  };
};

// === Saved Posts ===
export const getSavedPosts = async (userId, page, limit) => {
  page = page || 1;
  limit = limit || 15;
  const skip = (page - 1) * limit;
  const saves = await Save.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
  const postIds = saves.map(s => s.postId);
  const posts = await Post.find({ _id: { $in: postIds }, deletedAt: null }).populate('authorId', 'username avatarUrl role isVerified verifiedType status').lean();
  // Reorder posts to match save order (newest saved first)
  const postMap = new Map(posts.map(p => [p._id.toString(), p]));
  const orderedPosts = postIds.map(id => postMap.get(id.toString())).filter(Boolean);

  // Filter out posts from banned/suspended authors
  const activePosts = orderedPosts.filter(p => p.authorId && p.authorId.status === 'active');

  // Hydrate like/save state - all saved posts are isSavedByMe: true
  if (activePosts.length > 0) {
    const activePostIds = activePosts.map(p => p._id);
    const likes = await Like.find({ userId, postId: { $in: activePostIds } }).select('postId').lean();
    const likedSet = new Set(likes.map(l => l.postId.toString()));
    activePosts.forEach(post => {
      post.isSavedByMe = true;
      post.isLikedByMe = likedSet.has(post._id.toString());
    });
  }

  // Note: totalItems reflects all saves. Some may be filtered if authors are banned.
  // This is acceptable as the count will self-correct when users unsave banned authors' posts.
  const totalItems = await Save.countDocuments({ userId });
  return { data: activePosts, meta: { currentPage: page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) } };
};

// === Push Token Management ===
export const registerPushToken = async (userId, token) => {
  console.log('[PushToken] $addToSet pushTokens for userId:', userId, 'token:', token.substring(0, 20) + '...');
  await User.findByIdAndUpdate(
    userId,
    { $addToSet: { pushTokens: token } }
  );
  console.log('[PushToken] DB $addToSet completed for userId:', userId);
  return true;
};

export const removePushToken = async (userId, token) => {
  await User.findByIdAndUpdate(
    userId,
    { $pull: { pushTokens: token } }
  );
  return true;
};

// === Follow System ===
export const followUser = async (currentUserId, targetUserId) => {
  if (currentUserId === targetUserId) {
    throw Object.assign(new Error('Cannot follow yourself'), { status: 400 });
  }

  const targetUser = await User.findById(targetUserId).select('_id').lean();
  if (!targetUser) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  try {
    await Follow.create({ followerId: currentUserId, followingId: targetUserId });
    await Promise.all([
      User.findByIdAndUpdate(targetUserId, { $inc: { 'stats.followers': 1 } }),
      User.findByIdAndUpdate(currentUserId, { $inc: { 'stats.following': 1 } })
    ]);

    // Emit realtime event to both follower and target
    emitToUser(currentUserId, EVENTS.FOLLOW_CREATED, { followerId: currentUserId, followingId: targetUserId });
    emitToUser(targetUserId, EVENTS.FOLLOW_CREATED, { followerId: currentUserId, followingId: targetUserId });

    notificationService.createNotification({
      recipientId: targetUserId,
      senderId: currentUserId,
      postId: null,
      type: 'Follow',
      message: 'started following you'
    }).catch(console.error);
    return true;
  } catch (err) {
    if (err.code === 11000) return true; // Already following
    throw err;
  }
};

export const unfollowUser = async (currentUserId, targetUserId) => {
  const deleted = await Follow.findOneAndDelete({ followerId: currentUserId, followingId: targetUserId });
  if (deleted) {
    await Promise.all([
      User.findByIdAndUpdate(targetUserId, { $inc: { 'stats.followers': -1 } }),
      User.findByIdAndUpdate(currentUserId, { $inc: { 'stats.following': -1 } })
    ]);

    // Emit realtime event to both follower and target
    emitToUser(currentUserId, EVENTS.FOLLOW_DELETED, { followerId: currentUserId, followingId: targetUserId });
    emitToUser(targetUserId, EVENTS.FOLLOW_DELETED, { followerId: currentUserId, followingId: targetUserId });
  }
  return true;
};

export const getFollowers = async (userId, page, limit) => {
  page = page || 1;
  limit = limit || 20;
  const skip = (page - 1) * limit;

  const [follows, totalItems] = await Promise.all([
    Follow.find({ followingId: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('followerId', 'username avatarUrl fullName')
      .lean(),
    Follow.countDocuments({ followingId: userId })
  ]);

  const totalPages = Math.ceil(totalItems / limit);

  return {
    data: follows.map(f => f.followerId),
    meta: {
      currentPage: page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages
    }
  };
};

export const getFollowing = async (userId, page, limit) => {
  page = page || 1;
  limit = limit || 20;
  const skip = (page - 1) * limit;

  const [follows, totalItems] = await Promise.all([
    Follow.find({ followerId: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('followingId', 'username avatarUrl fullName')
      .lean(),
    Follow.countDocuments({ followerId: userId })
  ]);

  const totalPages = Math.ceil(totalItems / limit);

  return {
    data: follows.map(f => f.followingId),
    meta: {
      currentPage: page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages
    }
  };
};

export const isFollowing = async (currentUserId, targetUserId) => {
  const exists = await Follow.exists({ followerId: currentUserId, followingId: targetUserId });
  return !!exists;
};

// === Notification Preferences ===
export const updateNotificationPreferences = async (userId, preferences) => {
  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  // Validate and apply preferences
  const validChannels = ['push', 'inApp'];
  const validTypes = ['like', 'save', 'follow', 'comment', 'adminBroadcast'];

  for (const channel of validChannels) {
    if (preferences[channel] && typeof preferences[channel] === 'object') {
      for (const type of validTypes) {
        if (typeof preferences[channel][type] === 'boolean') {
          if (!user.notificationPreferences) {
            user.notificationPreferences = { push: {}, inApp: {} };
          }
          if (!user.notificationPreferences[channel]) {
            user.notificationPreferences[channel] = {};
          }
          user.notificationPreferences[channel][type] = preferences[channel][type];
        }
      }
    }
  }

  user.markModified('notificationPreferences');
  await user.save();

  return user.notificationPreferences;
};

// === User Search ===
export const searchUsers = async (query, limit = 20) => {
  const safeQuery = escapeRegex(query);
  const users = await User.find({
    username: { $regex: '^' + safeQuery, $options: 'i' },
    status: 'active'
  })
    .select('_id username avatarUrl role isVerified verifiedType')
    .limit(limit)
    .lean();
  return users;
};