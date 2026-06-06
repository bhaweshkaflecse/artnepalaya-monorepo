import * as adminService from './admin.service.js';
import { AppConfig } from './appConfig.model.js';
import { CmsPage } from './cmsPage.model.js';
import { GlobalPopup } from './globalPopup.model.js';
import * as notificationService from '../notifications/notification.service.js';

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
    res.status(201).json({ success: true, message: 'Broadcast sent', data: result });
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
    const { heading, icon, body, ctaText, ctaLink, isActive } = req.body;
    const popup = await GlobalPopup.findOneAndUpdate(
      {},
      { $set: { heading, icon, body, ctaText, ctaLink, isActive, updatedBy: req.user.id } },
      { upsert: true, new: true }
    );
    res.status(200).json({ success: true, data: popup });
  } catch (err) { next(err); }
};