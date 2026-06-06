import * as userService from './user.service.js';

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
    const { page, limit } = req.query; // Already parsed to Numbers by Zod
    const result = await userService.getUserPosts(req.params.userId, page, limit);
    
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