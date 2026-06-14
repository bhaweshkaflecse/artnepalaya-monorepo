import * as adminService from './admin.service.js';
import { AppConfig } from './appConfig.model.js';
import { CmsPage } from './cmsPage.model.js';
import { GlobalPopup } from './globalPopup.model.js';
import { ArtworkType } from './artworkType.model.js';
import * as notificationService from '../notifications/notification.service.js';
import { User } from '../users/user.model.js';
import { Post } from '../posts/post.model.js';
import { Tag } from '../tags/tag.model.js';

export const getDashboardStats = async (req, res, next) => {
  try { res.status(200).json({ success: true, data: await adminService.getDashboardStats() }); } 
  catch (err) { next(err); }
};

export const getUsers = async (req, res, next) => {
  try { res.status(200).json({ success: true, ...(await adminService.getUsers(req.query.page, req.query.limit)) }); } 
  catch (err) { next(err); }
};

export const updateUserStatus = async (req, res, next) => {
  try { await adminService.updateUserStatus(req.params.userId, req.body.status); res.status(200).json({ success: true, message: "User status updated" }); } 
  catch (err) { next(err); }
};

export const getReports = async (req, res, next) => {
  try { res.status(200).json({ success: true, ...(await adminService.getReports(req.query.status, req.query.page, req.query.limit)) }); } 
  catch (err) { next(err); }
};

export const resolveReport = async (req, res, next) => {
  try { await adminService.resolveReport(req.params.reportId, req.user.id); res.status(200).json({ success: true, message: "Report resolved" }); } 
  catch (err) { next(err); }
};

export const getPosts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const search = req.query.search || '';
    const result = await adminService.getPosts(page, limit, search);
    res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
};

export const deletePost = async (req, res, next) => {
  try { await adminService.deletePost(req.params.postId); res.status(200).json({ success: true, message: "Post deleted permanently" }); } 
  catch (err) { next(err); }
};

export const getFeatured = async (req, res, next) => {
  try { res.status(200).json({ success: true, data: await adminService.getFeaturedPosts() }); } 
  catch (err) { next(err); }
};

export const addFeatured = async (req, res, next) => {
  try { await adminService.addFeaturedPost(req.body.postId, req.user.id); res.status(201).json({ success: true, message: "Post added to featured list" }); } 
  catch (err) { next(err); }
};

export const removeFeatured = async (req, res, next) => {
  try { await adminService.removeFeaturedPost(req.params.postId); res.status(200).json({ success: true, message: "Post removed from featured list" }); } 
  catch (err) { next(err); }
};

export const getAuthMedia = async (req, res, next) => {
  try {
    const config = await AppConfig.findOne({ key: 'auth_background_media' }).lean();
    res.status(200).json({ success: true, data: config ? config.value : [] });
  } catch (err) { next(err); }
};

export const updateAuthMedia = async (req, res, next) => {
  try {
    const { media } = req.body;
    await AppConfig.findOneAndUpdate(
      { key: 'auth_background_media' },
      { $set: { value: media, updatedBy: req.user.id } },
      { upsert: true, new: true }
    );
    res.status(200).json({ success: true, message: 'Auth media updated' });
  } catch (err) { next(err); }
};

export const getAnalytics = async (req, res, next) => {
  try { res.status(200).json({ success: true, data: await adminService.getAnalytics() }); }
  catch (err) { next(err); }
};

export const broadcastNotification = async (req, res, next) => {
  try {
    const { title, message } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'title and message are required' } });
    }
    const result = await notificationService.broadcastNotification(title, message);
    const recipientCount = result?.recipientCount || 0;
    const pushesSent = result?.pushesSent || 0;
    res.status(201).json({ success: true, message: `Broadcast sent: ${recipientCount} in-app notifications, ${pushesSent} push notifications delivered`, data: { notificationsCreated: recipientCount, pushesSent } });
  } catch (err) { next(err); }
};

export const getCmsPage = async (req, res, next) => {
  try {
    const page = await CmsPage.findOne({ slug: req.params.slug }).lean();
    if (!page) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'CMS page not found' } });
    }
    res.status(200).json({ success: true, data: page });
  } catch (err) { next(err); }
};

export const updateCmsPage = async (req, res, next) => {
  try {
    const { title, content } = req.body;
    const page = await CmsPage.findOneAndUpdate(
      { slug: req.params.slug },
      { $set: { title, content, updatedBy: req.user.id } },
      { upsert: true, new: true }
    );
    res.status(200).json({ success: true, data: page });
  } catch (err) { next(err); }
};

export const getGlobalPopup = async (req, res, next) => {
  try {
    const popup = await GlobalPopup.findOne().sort({ updatedAt: -1 }).lean();
    res.status(200).json({ success: true, data: popup || null });
  } catch (err) { next(err); }
};

export const updateGlobalPopup = async (req, res, next) => {
  try {
    const { heading, icon, body, ctaText, ctaLink, isActive, frequency } = req.body;
    const popup = await GlobalPopup.findOneAndUpdate(
      {},
      { $set: { heading, icon, body, ctaText, ctaLink, isActive, frequency, updatedBy: req.user.id } },
      { upsert: true, new: true }
    );
    res.status(200).json({ success: true, data: popup });
  } catch (err) { next(err); }
};

export const getPushStats = async (req, res, next) => {
  try {
    const usersWithTokens = await User.countDocuments({ pushTokens: { $exists: true, $not: { $size: 0 } } });
    const result = await User.aggregate([
      { $match: { pushTokens: { $exists: true, $not: { $size: 0 } } } },
      { $project: { tokenCount: { $size: '$pushTokens' } } },
      { $group: { _id: null, totalTokens: { $sum: '$tokenCount' } } },
    ]);
    const totalTokens = result.length > 0 ? result[0].totalTokens : 0;
    res.status(200).json({ success: true, data: { usersWithTokens, totalTokens } });
  } catch (err) { next(err); }
};

export const getDebugPosts = async (req, res, next) => {
  try {
    const posts = await Post.find().limit(20).lean();
    const data = posts.map((p) => ({
      _id: p._id,
      caption: p.caption,
      mediaType: p.media?.[0]?.type || null,
      mediaUrl: p.media?.[0]?.url || null,
    }));
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

// --- Artwork Type Management ---

export const getArtworkTypes = async (req, res, next) => {
  try {
    const types = await ArtworkType.find().sort({ sortOrder: 1, name: 1 }).lean();
    res.status(200).json({ success: true, data: types });
  } catch (err) { next(err); }
};

export const createArtworkType = async (req, res, next) => {
  try {
    const { name, sortOrder } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'name is required' } });
    }
    const artworkType = await ArtworkType.create({ name, sortOrder: sortOrder || 0 });
    res.status(201).json({ success: true, data: artworkType });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: 'Artwork type already exists' } });
    }
    next(err);
  }
};

export const updateArtworkType = async (req, res, next) => {
  try {
    const { name, sortOrder } = req.body;
    const artworkType = await ArtworkType.findByIdAndUpdate(
      req.params.id,
      { $set: { name, sortOrder } },
      { new: true, runValidators: true }
    );
    if (!artworkType) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Artwork type not found' } });
    }
    res.status(200).json({ success: true, data: artworkType });
  } catch (err) { next(err); }
};

export const toggleArtworkType = async (req, res, next) => {
  try {
    const artworkType = await ArtworkType.findById(req.params.id);
    if (!artworkType) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Artwork type not found' } });
    }
    artworkType.isActive = !artworkType.isActive;
    await artworkType.save();
    res.status(200).json({ success: true, data: artworkType });
  } catch (err) { next(err); }
};

// --- Tag Management ---

export const getAdminTags = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const [tags, total] = await Promise.all([
      Tag.find().sort({ postCount: -1 }).skip(skip).limit(limit).lean(),
      Tag.countDocuments()
    ]);
    res.status(200).json({ success: true, data: tags, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
};

export const createAdminTag = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'name is required' } });
    }
    const tag = await Tag.create({ name: name.toLowerCase().trim(), postCount: 0 });
    res.status(201).json({ success: true, data: tag });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: 'Tag already exists' } });
    }
    next(err);
  }
};

export const updateAdminTag = async (req, res, next) => {
  try {
    const { name, status } = req.body;
    const updateFields = {};
    if (name) updateFields.name = name.toLowerCase().trim();
    if (status) updateFields.status = status;
    const tag = await Tag.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    );
    if (!tag) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Tag not found' } });
    }
    res.status(200).json({ success: true, data: tag });
  } catch (err) { next(err); }
};

export const deleteAdminTag = async (req, res, next) => {
  try {
    const tag = await Tag.findByIdAndDelete(req.params.id);
    if (!tag) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Tag not found' } });
    }
    res.status(200).json({ success: true, message: 'Tag deleted' });
  } catch (err) { next(err); }
};

export const mergeAdminTags = async (req, res, next) => {
  try {
    const { sourceId, targetId } = req.body;
    if (!sourceId || !targetId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'sourceId and targetId are required' } });
    }
    if (sourceId === targetId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Cannot merge a tag into itself' } });
    }
    const [source, target] = await Promise.all([
      Tag.findById(sourceId),
      Tag.findById(targetId)
    ]);
    if (!source || !target) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Source or target tag not found' } });
    }
    // Update all posts that use the source tag to use the target tag
    await Post.updateMany(
      { tags: source.name },
      { $addToSet: { tags: target.name } }
    );
    await Post.updateMany(
      { tags: source.name },
      { $pull: { tags: source.name } }
    );
    // Transfer count
    target.postCount = (target.postCount || 0) + (source.postCount || 0);
    await target.save();
    await Tag.findByIdAndDelete(sourceId);
    res.status(200).json({ success: true, message: 'Tags merged successfully', data: target });
  } catch (err) { next(err); }
};
