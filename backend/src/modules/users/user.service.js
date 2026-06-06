import { User } from './user.model.js';
import { Post } from '../posts/post.model.js';

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