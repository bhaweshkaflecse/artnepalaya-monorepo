import mongoose from 'mongoose';
import * as postService from './post.service.js';
import { v2 as cloudinary } from 'cloudinary';

// --- NEW HELPER FUNCTION: Uploads RAM buffer to Cloudinary ---
const uploadBufferToCloudinary = (buffer, isVideo) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { 
        folder: 'art_nepalaya_posts', // It will create this folder in your Cloudinary
        resource_type: isVideo ? 'video' : 'image' 
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });
};

// --- UPDATED CONTROLLER ---
export const createPost = async (req, res, next) => {
  try {
    console.log('[CREATE_POST] HIT - user:', req.user?.id, 'files:', req.files?.length || 0);
    const postData = req.body;
    let uploadedFiles = [];
    
    if (req.files && req.files.length > 0) uploadedFiles = req.files;
    else if (req.file) uploadedFiles = [req.file];

    if (uploadedFiles.length > 0) {
      // THE FIX: Push all RAM buffers to Cloudinary and wait for the URLs!
      const uploadPromises = uploadedFiles.map(async (file) => {
        const cloudResult = await uploadBufferToCloudinary(file.buffer, file.isAppVideo);
        
        return {
          url: cloudResult.secure_url,
          providerId: cloudResult.public_id,
          type: file.isAppVideo ? 'video' : 'image'
        };
      });

      // Wait for all images to finish uploading, then attach to database payload
      postData.media = await Promise.all(uploadPromises);
    } else {
      delete postData.media;
    }

    const post = await postService.createPost(req.user.id, postData);
    res.status(201).json({ success: true, message: "Post created successfully", data: post });
  } catch (err) { 
    next(err); 
  }
};

export const getPostLikes = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.postId)) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid post ID format' } });
    }
    const users = await postService.getPostLikes(req.params.postId);
    res.status(200).json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
};

export const getSinglePost = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.postId)) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid post ID format' } });
    }
    const post = await postService.getSinglePost(req.params.postId, req.user?.id || null, req.user?.showMatureContent ?? true);
    res.status(200).json({ success: true, data: post });
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ success: false, error: { code: 'NSFW_RESTRICTED', message: err.message } });
    if (err.status === 404) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: err.message }});
    next(err);
  }
};

export const getFeed = async (req, res, next) => {
  try {
    const { cursor, limit } = req.query;
    const showMatureContent = req.user?.showMatureContent ?? true;
    const result = await postService.getFeed(req.user?.id || null, cursor, limit, showMatureContent);
    res.status(200).json({ success: true, data: result.data, meta: result.meta });
  } catch (err) { next(err); }
};

export const likePost = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.postId)) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid post ID format' } });
    }
    await postService.addLike(req.user.id, req.params.postId);
    res.status(200).json({ success: true, message: "Post liked" });
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: err.message }});
    next(err);
  }
};

export const unlikePost = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.postId)) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid post ID format' } });
    }
    await postService.removeLike(req.user.id, req.params.postId);
    res.status(200).json({ success: true, message: "Post unliked" });
  } catch (err) { next(err); }
};

export const savePost = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.postId)) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid post ID format' } });
    }
    await postService.addSave(req.user.id, req.params.postId);
    res.status(200).json({ success: true, message: "Post saved" });
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: err.message }});
    next(err);
  }
};

export const unsavePost = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.postId)) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid post ID format' } });
    }
    await postService.removeSave(req.user.id, req.params.postId);
    res.status(200).json({ success: true, message: "Post unsaved" });
  } catch (err) { next(err); }
};

export const updatePost = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.postId)) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid post ID format' } });
    }
    const updatedPost = await postService.updatePost(req.params.postId, req.user.id, req.user.role, req.body);
    res.status(200).json({ success: true, message: 'Post updated successfully', data: updatedPost });
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: err.message } });
    if (err.status === 404) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: err.message } });
    next(err);
  }
};

export const deletePost = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.postId)) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid post ID format' } });
    }
    await postService.deletePost(req.params.postId, req.user.id, req.user.role);
    res.status(200).json({ success: true, message: 'Post deleted successfully' });
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: err.message } });
    if (err.status === 404) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: err.message } });
    next(err);
  }
};