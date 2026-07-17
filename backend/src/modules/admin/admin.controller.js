import * as adminService from './admin.service.js';
import { AppConfig } from './appConfig.model.js';
import { CmsPage } from './cmsPage.model.js';
import { GlobalPopup } from './globalPopup.model.js';
import { ArtworkType } from './artworkType.model.js';
import * as notificationService from '../notifications/notification.service.js';
import { BroadcastLog } from '../notifications/broadcastLog.model.js';
import { NotificationGroup } from '../notifications/notificationGroup.model.js';
import { getNotificationConfig as loadNotificationConfig, DEFAULT_CONFIG } from '../notifications/notificationConfig.js';
import { User } from '../users/user.model.js';
import { Post } from '../posts/post.model.js';
import { Tag } from '../tags/tag.model.js';
import { buildRecommendedFeed, buildExploreFeed } from '../posts/recommendation.service.js';
import { resolveUserId } from '../users/user.service.js';

export const getDashboardStats = async (req, res, next) => {
  try { res.status(200).json({ success: true, data: await adminService.getDashboardStats() }); } 
  catch (err) { next(err); }
};

export const getUsers = async (req, res, next) => {
  try { res.status(200).json({ success: true, ...(await adminService.getUsers(req.query.page, req.query.limit, req.query.search)) }); } 
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
    const deleted = req.query.deleted === 'true';
    const result = await adminService.getPosts(page, limit, search, deleted);
    res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
};

export const softDeletePost = async (req, res, next) => {
  try {
    await adminService.softDeletePost(req.params.postId);
    res.status(200).json({ success: true, message: 'Post moved to trash' });
  } catch (err) { next(err); }
};

export const deletePost = async (req, res, next) => {
  try { await adminService.deletePost(req.params.postId); res.status(200).json({ success: true, message: "Post deleted permanently" }); } 
  catch (err) { next(err); }
};

export const restorePost = async (req, res, next) => {
  try { await adminService.restorePost(req.params.postId); res.status(200).json({ success: true, message: "Post restored successfully" }); }
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
    const storedValue = config ? config.value : [];

    // If stored value is an array of postIds (strings), resolve post details for admin display
    if (Array.isArray(storedValue) && storedValue.length > 0 && typeof storedValue[0] === 'string') {
      const postIds = storedValue;
      const posts = await Post.find({ _id: { $in: postIds }, deletedAt: null })
        .select('media authorId caption createdAt')
        .populate('authorId', 'username')
        .lean();

      // Maintain original order
      const postMap = {};
      posts.forEach((p) => { postMap[p._id.toString()] = p; });
      const resolvedPosts = postIds
        .filter((id) => postMap[id])
        .map((id) => {
          const p = postMap[id];
          return {
            postId: p._id,
            url: p.media?.[0]?.url || '',
            type: p.media?.[0]?.type || 'image',
            caption: p.caption || '',
            artist: p.authorId?.username || '',
            createdAt: p.createdAt,
          };
        });

      res.status(200).json({ success: true, data: { postIds, posts: resolvedPosts } });
    } else {
      // Legacy format: raw media entries
      res.status(200).json({ success: true, data: { postIds: [], posts: [], legacy: storedValue } });
    }
  } catch (err) { next(err); }
};

export const updateAuthMedia = async (req, res, next) => {
  try {
    const { postIds } = req.body;
    if (!Array.isArray(postIds)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'postIds must be an array' } });
    }
    await AppConfig.findOneAndUpdate(
      { key: 'auth_background_media' },
      { $set: { value: postIds, updatedBy: req.user.id } },
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
    const result = await notificationService.broadcastNotification(title, message, req.user.id);
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
    const popups = await GlobalPopup.find().sort({ createdAt: -1 }).lean();
    res.status(200).json({ success: true, data: popups });
  } catch (err) { next(err); }
};

export const updateGlobalPopup = async (req, res, next) => {
  try {
    const { heading, icon, body, ctaText, ctaLink, isActive, frequency, startsAt, endsAt } = req.body;
    const popup = await GlobalPopup.findByIdAndUpdate(
      req.params.id,
      { $set: { heading, icon, body, ctaText, ctaLink, isActive, frequency, startsAt: startsAt || null, endsAt: endsAt || null, updatedBy: req.user.id } },
      { new: true }
    );
    if (!popup) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Popup not found' } });
    }
    res.status(200).json({ success: true, data: popup });
  } catch (err) { next(err); }
};

export const createGlobalPopup = async (req, res, next) => {
  try {
    const { heading, icon, body, ctaText, ctaLink, isActive, frequency, startsAt, endsAt } = req.body;
    if (!heading || !body) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'heading and body are required' } });
    }
    const popup = await GlobalPopup.create({
      heading, icon, body, ctaText, ctaLink, isActive, frequency,
      startsAt: startsAt || null, endsAt: endsAt || null,
      createdBy: req.user.id, updatedBy: req.user.id
    });
    res.status(201).json({ success: true, data: popup });
  } catch (err) { next(err); }
};

export const archiveGlobalPopup = async (req, res, next) => {
  try {
    const popup = await GlobalPopup.findByIdAndUpdate(
      req.params.id,
      { $set: { isArchived: true, isActive: false } },
      { new: true }
    );
    if (!popup) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Popup not found' } });
    }
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

    // Notification group stats
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [totalGroups, totalUnread, groupsLast24h] = await Promise.all([
      NotificationGroup.countDocuments(),
      NotificationGroup.countDocuments({ isRead: false }),
      NotificationGroup.countDocuments({ groupCreatedAt: { $gte: twentyFourHoursAgo } })
    ]);

    res.status(200).json({ success: true, data: { usersWithTokens, totalTokens, totalGroups, totalUnread, groupsLast24h } });
  } catch (err) { next(err); }
};

export const getDebugPosts = async (req, res, next) => {
  try {
    const posts = await Post.find({ deletedAt: null }).limit(20).lean();
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
    // Only check sortOrder uniqueness if explicitly provided (not undefined/null).
    // If not provided, the schema default (0) applies without uniqueness enforcement.
    if (sortOrder !== undefined && sortOrder !== null) {
      const existingOrder = await ArtworkType.findOne({ sortOrder });
      if (existingOrder) {
        return res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: 'Sort Order must be unique. Another artwork type already uses this value.' } });
      }
    }
    const createFields = { name };
    if (sortOrder !== undefined && sortOrder !== null) createFields.sortOrder = sortOrder;
    const artworkType = await ArtworkType.create(createFields);
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
    if (sortOrder !== undefined && sortOrder !== null) {
      const existingOrder = await ArtworkType.findOne({ sortOrder, _id: { $ne: req.params.id } });
      if (existingOrder) {
        return res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: 'Sort Order must be unique. Another artwork type already uses this value.' } });
      }
    }
    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (sortOrder !== undefined && sortOrder !== null) updateFields.sortOrder = sortOrder;
    const artworkType = await ArtworkType.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
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
    // Remove the deleted tag name from all posts that reference it
    await Post.updateMany(
      { tags: tag.name },
      { $pull: { tags: tag.name } }
    );
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

// --- Feed Analytics ---

export const getFeedAnalytics = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const data = await adminService.getFeedAnalytics(limit);
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

// --- Featured Content Order & Expiry ---

export const updateFeaturedOrder = async (req, res, next) => {
  try {
    const { sortOrder } = req.body;
    if (sortOrder === undefined || sortOrder === null) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'sortOrder is required' } });
    }
    await adminService.updateFeaturedOrder(req.params.postId, Number(sortOrder));
    res.status(200).json({ success: true, message: 'Featured post order updated' });
  } catch (err) { next(err); }
};

export const updateFeaturedExpiry = async (req, res, next) => {
  try {
    const { expiresAt } = req.body;
    await adminService.updateFeaturedExpiry(req.params.postId, expiresAt);
    res.status(200).json({ success: true, message: 'Featured post expiration updated' });
  } catch (err) { next(err); }
};

// --- Search Insights ---

export const getSearchInsights = async (req, res, next) => {
  try {
    const data = await adminService.getSearchInsights();
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

// --- User Verification ---

export const verifyUser = async (req, res, next) => {
  try {
    const { verifiedType } = req.body;
    const validTypes = ['artist', 'gallery', 'business'];
    if (!verifiedType || !validTypes.includes(verifiedType)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'verifiedType must be one of: artist, gallery, business' } });
    }
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { $set: { isVerified: true, verifiedType } },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    }
    res.status(200).json({ success: true, message: 'User verified', data: { isVerified: user.isVerified, verifiedType: user.verifiedType } });
  } catch (err) { next(err); }
};

export const unverifyUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { $set: { isVerified: false, verifiedType: null } },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    }
    res.status(200).json({ success: true, message: 'User unverified', data: { isVerified: user.isVerified, verifiedType: user.verifiedType } });
  } catch (err) { next(err); }
};

// --- Moderation Notes ---

export const updateReportNotes = async (req, res, next) => {
  try {
    const { notes } = req.body;
    const report = await adminService.updateReportNotes(req.params.reportId, notes);
    res.status(200).json({ success: true, data: report });
  } catch (err) { next(err); }
};

// --- Broadcast History ---

export const getBroadcastHistory = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const [logs, totalItems] = await Promise.all([
      BroadcastLog.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      BroadcastLog.countDocuments()
    ]);
    res.status(200).json({
      success: true,
      data: logs,
      meta: { currentPage: page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) }
    });
  } catch (err) { next(err); }
};

// --- Notification Configuration ---

export const getNotificationConfig = async (req, res, next) => {
  try {
    const config = await loadNotificationConfig();
    res.status(200).json({ success: true, data: config });
  } catch (err) { next(err); }
};

export const updateNotificationConfig = async (req, res, next) => {
  try {
    const { groupingWindows, pushCooldowns } = req.body;

    // Validate input - all values must be positive numbers
    if (groupingWindows) {
      for (const [key, value] of Object.entries(groupingWindows)) {
        if (typeof value !== 'number' || value <= 0) {
          return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: `groupingWindows.${key} must be a positive number (in milliseconds)` }
          });
        }
      }
    }

    if (pushCooldowns) {
      for (const [key, value] of Object.entries(pushCooldowns)) {
        if (typeof value !== 'number' || value < 0) {
          return res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: `pushCooldowns.${key} must be a non-negative number (in milliseconds)` }
          });
        }
      }
    }

    // Build the update value by merging with defaults
    const currentConfig = await AppConfig.findOne({ key: 'notification_config' }).lean();
    const currentValue = currentConfig?.value || {};

    const updatedValue = {
      groupingWindows: {
        ...DEFAULT_CONFIG.groupingWindows,
        ...(currentValue.groupingWindows || {}),
        ...(groupingWindows || {})
      },
      pushCooldowns: {
        ...DEFAULT_CONFIG.pushCooldowns,
        ...(currentValue.pushCooldowns || {}),
        ...(pushCooldowns || {})
      },
      maxRecentActors: req.body.maxRecentActors ?? currentValue.maxRecentActors ?? DEFAULT_CONFIG.maxRecentActors,
      displayThresholds: {
        ...DEFAULT_CONFIG.displayThresholds,
        ...(currentValue.displayThresholds || {}),
        ...(req.body.displayThresholds || {})
      }
    };

    await AppConfig.findOneAndUpdate(
      { key: 'notification_config' },
      { $set: { value: updatedValue, updatedBy: req.user.id } },
      { upsert: true, new: true }
    );

    res.status(200).json({ success: true, message: 'Notification configuration updated', data: updatedValue });
  } catch (err) { next(err); }
};

// --- Recommendation Engine Simulation ---

export const simulateRecommendation = async (req, res, next) => {
  try {
    const { userId, mode = 'user', limit: rawLimit } = req.query;
    const limit = Math.min(Math.max(parseInt(rawLimit) || 15, 1), 50);

    let feedResult;

    if (mode === 'guest' || !userId) {
      // Guest mode: use explore feed with debug
      feedResult = await buildExploreFeed(null, null, limit, false, null, { debug: true });
    } else {
      // Resolve username/email/ObjectId to a valid ObjectId
      const resolvedId = await resolveUserId(userId);
      if (!resolvedId) {
        return res.status(404).json({ success: false, message: 'User not found for identifier: ' + userId });
      }

      // User mode: use personalized recommended feed with debug
      feedResult = await buildRecommendedFeed(resolvedId, null, limit, false, { debug: true });

      // If buildRecommendedFeed returns null (user has no preferences), fallback to explore
      if (feedResult === null) {
        feedResult = await buildExploreFeed(resolvedId, null, limit, false, null, { debug: true });
        if (feedResult.debug) {
          feedResult.debug.fallbackReason = 'User has no interest preferences set';
        }
      }
    }

    res.status(200).json({
      success: true,
      data: feedResult.data,
      meta: feedResult.meta,
      debug: feedResult.debug || null,
    });
  } catch (err) { next(err); }
};
