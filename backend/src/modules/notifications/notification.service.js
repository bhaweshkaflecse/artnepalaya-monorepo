import { Notification } from './notification.model.js';
import { User } from '../users/user.model.js';
import { sendPushNotifications } from '../../shared/utils/pushNotifications.js';

export const createNotification = async (payload) => {
  const { recipientId, senderId, postId, type, message } = payload;
  
  if (senderId && recipientId.toString() === senderId.toString()) return null; 

  if (type === 'Like' || type === 'Save') {
    const existing = await Notification.findOneAndUpdate(
      { recipientId, senderId, postId, type },
      { $set: { isRead: false, createdAt: new Date() } },
      { new: true }
    );
    if (existing) return existing;
  }
  return Notification.create({ recipientId, senderId, postId, type, message });
};

export const getUserNotifications = async (userId, page, limit, filter = 'all') => {
  const skip = (page - 1) * limit;
  const query = { recipientId: userId };

  if (filter === 'unread') {
    query.isRead = false;
  } else if (filter === 'read') {
    query.isRead = true;
  }

  const [notifications, totalItems, unreadCount] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit)
      .populate('senderId', 'username avatarUrl')
      .populate('postId', 'media').lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({ recipientId: userId, isRead: false })
  ]);
  const totalPages = Math.ceil(totalItems / limit);
  return {
    data: notifications,
    meta: { currentPage: page, limit, totalItems, totalPages, unreadCount, hasNextPage: page < totalPages }
  };
};

export const markAllAsRead = async (userId) => {
  await Notification.updateMany({ recipientId: userId, isRead: false }, { $set: { isRead: true } });
  return true;
};

export const broadcastNotification = async (title, message) => {
  const BATCH_SIZE = 500;
  let recipientCount = 0;
  let skip = 0;
  let batch;

  do {
    batch = await User.find({ status: 'active' }, '_id').lean().skip(skip).limit(BATCH_SIZE);
    if (batch.length > 0) {
      const notifications = batch.map((user) => ({
        recipientId: user._id,
        senderId: null,
        postId: null,
        type: 'AdminBroadcast',
        title,
        message,
        isRead: false
      }));
      await Notification.insertMany(notifications);
      recipientCount += notifications.length;
    }
    skip += BATCH_SIZE;
  } while (batch.length === BATCH_SIZE);

  // Send actual push notifications to users with push tokens
  const usersWithTokens = await User.find(
    { status: 'active', pushTokens: { $exists: true, $ne: [] } },
    'pushTokens'
  ).lean();

  const allTokens = usersWithTokens.reduce((tokens, user) => {
    return tokens.concat(user.pushTokens);
  }, []);

  const pushResult = await sendPushNotifications(allTokens, title, message);

  return { recipientCount, pushesSent: pushResult.sent, pushesFailed: pushResult.failed };
};