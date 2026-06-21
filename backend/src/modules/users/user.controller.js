import mongoose from 'mongoose';
import * as userService from './user.service.js';
import { Post } from '../posts/post.model.js';

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
const invalidIdResponse = (res) => res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid user ID format' } });

export const getMe = async (req, res, next) => {
  try {
    const user = await userService.getUserProfile(req.user.id, false);
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: err.message }});
    }
    next(err);
  }
};

export const updateMe = async (req, res, next) => {
  try {
    const updatedUser = await userService.updateUserProfile(req.user.id, req.body);
    res.status(200).json({ success: true, message: "Profile updated successfully", data: updatedUser });
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: err.message }});
    }
    next(err);
  }
};

export const getPublicProfile = async (req, res, next) => {
  try {
    if (!isValidId(req.params.userId)) return invalidIdResponse(res);
    const user = await userService.getUserProfile(req.params.userId, true);
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: err.message }});
    }
    next(err);
  }
};

export const getUserPosts = async (req, res, next) => {
  try {
    if (!req.params.userId || !isValidId(req.params.userId)) {
      return invalidIdResponse(res);
    }
    const { page, limit } = req.query; // Already parsed to Numbers by Zod
    const viewerId = req.user?.id;
    const result = await userService.getUserPosts(req.params.userId, page, limit, viewerId);
    
    res.status(200).json({ 
      success: true, 
      data: result.data, 
      meta: result.meta 
    });
  } catch (err) {
    next(err);
  }
};

export const registerPushToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'token is required' } });
    }
    await userService.registerPushToken(req.user.id, token);
    res.status(200).json({ success: true, message: 'Push token registered' });
  } catch (err) {
    next(err);
  }
};

export const getSavedPosts = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await userService.getSavedPosts(req.user.id, page, limit);
    res.status(200).json({ success: true, data: result.data, meta: result.meta });
  } catch (err) {
    next(err);
  }
};

export const removePushToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'token is required' } });
    }
    await userService.removePushToken(req.user.id, token);
    res.status(200).json({ success: true, message: 'Push token removed' });
  } catch (err) {
    next(err);
  }
};

// === Follow System ===
export const followUser = async (req, res, next) => {
  try {
    if (!isValidId(req.params.userId)) return invalidIdResponse(res);
    await userService.followUser(req.user.id, req.params.userId);
    res.status(200).json({ success: true, message: 'Followed successfully' });
  } catch (err) {
    if (err.status === 400) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: err.message } });
    }
    next(err);
  }
};

export const unfollowUser = async (req, res, next) => {
  try {
    if (!isValidId(req.params.userId)) return invalidIdResponse(res);
    await userService.unfollowUser(req.user.id, req.params.userId);
    res.status(200).json({ success: true, message: 'Unfollowed successfully' });
  } catch (err) {
    next(err);
  }
};

export const getFollowers = async (req, res, next) => {
  try {
    if (!isValidId(req.params.userId)) return invalidIdResponse(res);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await userService.getFollowers(req.params.userId, page, limit);
    res.status(200).json({ success: true, data: result.data, meta: result.meta });
  } catch (err) {
    next(err);
  }
};

export const getFollowing = async (req, res, next) => {
  try {
    if (!isValidId(req.params.userId)) return invalidIdResponse(res);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await userService.getFollowing(req.params.userId, page, limit);
    res.status(200).json({ success: true, data: result.data, meta: result.meta });
  } catch (err) {
    next(err);
  }
};

export const getFollowStatus = async (req, res, next) => {
  try {
    if (!isValidId(req.params.userId)) return invalidIdResponse(res);
    const isFollowing = await userService.isFollowing(req.user.id, req.params.userId);
    res.status(200).json({ success: true, data: { isFollowing } });
  } catch (err) {
    next(err);
  }
};

export const getUserMetrics = async (req, res, next) => {
  try {
    if (!isValidId(req.params.userId)) return invalidIdResponse(res);
    const userId = new mongoose.Types.ObjectId(req.params.userId);
    const result = await Post.aggregate([
      { $match: { authorId: userId } },
      {
        $group: {
          _id: null,
          totalPosts: { $sum: 1 },
          totalLikes: { $sum: { $ifNull: ['$likesCount', 0] } },
          totalSaves: { $sum: { $ifNull: ['$savesCount', 0] } },
        },
      },
    ]);
    const metrics = result.length > 0
      ? { totalPosts: result[0].totalPosts, totalLikes: result[0].totalLikes, totalSaves: result[0].totalSaves }
      : { totalPosts: 0, totalLikes: 0, totalSaves: 0 };
    res.status(200).json({ success: true, data: metrics });
  } catch (err) {
    next(err);
  }
};

// === User Search ===
export const searchUsers = async (req, res, next) => {
  try {
    const q = req.query.q || '';
    const limit = parseInt(req.query.limit) || 20;
    if (!q || q.length < 1) {
      return res.status(200).json({ success: true, data: [] });
    }
    const users = await userService.searchUsers(q, limit);
    res.status(200).json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
};