import * as notificationService from './notification.service.js';

export const getNotifications = async (req, res, next) => {
  try {
    const { page, limit, filter } = req.query;
    const result = await notificationService.getUserNotifications(req.user.id, page, limit, filter);
    res.status(200).json({ success: true, data: result.data, meta: result.meta });
  } catch (err) { next(err); }
};

export const markAsRead = async (req, res, next) => {
  try {
    await notificationService.markAllAsRead(req.user.id);
    res.status(200).json({ success: true, message: "Notifications marked as read" });
  } catch (err) { next(err); }
};