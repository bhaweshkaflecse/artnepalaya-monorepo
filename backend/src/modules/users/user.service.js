import { User } from './user.model.js';
import { Post } from '../posts/post.model.js';
import { Save } from '../posts/post-interaction.model.js';
import { Follow } from './follow.model.js';

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

// === Update Profile ===
export const updateUserProfile = async (userId, updateData) => {
  // We use findById + save() instead of findByIdAndUpdate so your pre('save') hook runs!
  const user = await User.findById(userId);
  
  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  // Define exactly what the user is allowed to change (mapped to our Zod schema)
  const allowedUpdates = ['username', 'fullName', 'avatarUrl', 'dob', 'role', 'subRoles', 'interests', 'bio', 'nsfwBlurEnabled'];
  
  allowedUpdates.forEach((field) => {
    if (updateData[field] !== undefined) {
      user[field] = updateData[field];
    }
  });

  // This save triggers the DOB to age calculation in user.model.js!
  await user.save();
  
  return user.toObject(); // Convert to plain object for the API response
};

// === Fetch User Posts (Offset Pagination) ===
export const getUserPosts = async (userId, page, limit) => {
  const skip = (page - 1) * limit;

  const [posts, totalItems] = await Promise.all([
    Post.find({ authorId: userId })
      .sort({ createdAt: -1 }) // Newest first
      .skip(skip)
      .limit(limit)
      .lean(),
    Post.countDocuments({ authorId: userId })
  ]);

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
  const posts = await Post.find({ _id: { $in: postIds } }).populate('authorId', 'username avatarUrl role').lean();
  const totalItems = await Save.countDocuments({ userId });
  return { data: posts, meta: { currentPage: page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) } };
};

// === Push Token Management ===
export const registerPushToken = async (userId, token) => {
  await User.findByIdAndUpdate(
    userId,
    { $addToSet: { pushTokens: token } }
  );
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
      .populate('followerId', 'username avatarUrl')
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
      .populate('followingId', 'username avatarUrl')
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