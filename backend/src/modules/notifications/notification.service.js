import { Notification } from './notification.model.js';
import { User } from '../users/user.model.js';
import { send as pushServiceSend } from '../../shared/services/pushService.js';
import { emitToUser } from '../../realtime/emitter.js';
import { EVENTS } from '../../realtime/events.js';
import { BroadcastLog } from './broadcastLog.model.js';

/**
 * Maps notification type to the preference key used in notificationPreferences.push.*
 */
const typeToPreferenceKey = {
  Like: 'like',
  Save: 'save',
  Follow: 'follow',
  Comment: 'comment',
  AdminBroadcast: 'adminBroadcast',
  System: 'adminBroadcast',
};

/**
 * Maps notification type to a human-readable push title
 */
const typeToTitle = {
  Like: 'New Like',
  Save: 'New Save',
  Follow: 'New Follower',
  Comment: 'New Comment',
  AdminBroadcast: 'ArtNepalaya',
  System: 'ArtNepalaya',
};

export const createNotification = async (payload) => {
  const { recipientId, senderId, postId, type, message } = payload;
  
  if (senderId && recipientId.toString() === senderId.toString()) return null; 

  if (type === 'Like' || type === 'Save') {
    const existing = await Notification.findOneAndUpdate(
      { recipientId, senderId, postId, type },
      { $set: { isRead: false, createdAt: new Date() } },
      { new: true }
    );
    if (existing) {
      // Emit unread count to recipient
      const unreadCount = await Notification.countDocuments({ recipientId, isRead: false });
      emitToUser(recipientId.toString(), EVENTS.NOTIFICATION_COUNT_CHANGED, { unreadCount });

      // Still send push for deduplicated notifications
      sendPushForNotification(recipientId, senderId, type, message).catch((err) =>
        console.error('[PushService] Push delivery error:', err.message || err)
      );

      return existing;
    }
  }

  const notification = await Notification.create({ recipientId, senderId, postId, type, message });

  // Emit unread count to recipient
  const unreadCount = await Notification.countDocuments({ recipientId, isRead: false });
  emitToUser(recipientId.toString(), EVENTS.NOTIFICATION_COUNT_CHANGED, { unreadCount });

  // Send push notification (non-blocking)
  sendPushForNotification(recipientId, senderId, type, message).catch((err) =>
    console.error('[PushService] Push delivery error:', err.message || err)
  );

  return notification;
};

/**
 * Looks up the recipient's push tokens and preferences, then sends a push notification
 * if the user has push enabled for that notification type.
 */
const sendPushForNotification = async (recipientId, senderId, type, message) => {
  const preferenceKey = typeToPreferenceKey[type];
  if (!preferenceKey) return;

  // Look up recipient with pushTokens and notificationPreferences
  const recipient = await User.findById(recipientId)
    .select('pushTokens notificationPreferences username')
    .lean();

  if (!recipient || !recipient.pushTokens || recipient.pushTokens.length === 0) {
    return;
  }

  // Check if push is enabled for this notification type
  const pushPrefs = recipient.notificationPreferences?.push;
  if (pushPrefs && pushPrefs[preferenceKey] === false) {
    console.log(`[PushService] Push disabled for ${type} by user ${recipientId}`);
    return;
  }

  // Build push title and body
  const title = typeToTitle[type] || 'ArtNepalaya';
  let body = message || `You have a new ${type.toLowerCase()} notification`;

  // If we have a senderId, get sender username for a better message
  if (senderId) {
    const sender = await User.findById(senderId).select('username').lean();
    if (sender && sender.username) {
      if (type === 'Like') {
        body = `${sender.username} liked your artwork`;
      } else if (type === 'Save') {
        body = `${sender.username} saved your artwork`;
      } else if (type === 'Follow') {
        body = `${sender.username} started following you`;
      } else if (type === 'Comment') {
        body = `${sender.username} commented on your artwork`;
      } else {
        body = message || `${sender.username} interacted with your content`;
      }
    }
  }

  await pushServiceSend({
    tokens: recipient.pushTokens,
    title,
    body,
    data: { type, senderId: senderId ? senderId.toString() : null },
  });
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

export const markOneAsRead = async (userId, notificationId) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipientId: userId, isRead: false },
    { $set: { isRead: true } },
    { new: true }
  );
  if (!notification) {
    const err = new Error('Notification not found');
    err.statusCode = 404;
    throw err;
  }
  return notification;
};

export const broadcastNotification = async (title, message, sentBy = null) => {
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

  // Send actual push notifications to users with push tokens who have adminBroadcast enabled
  const usersWithTokens = await User.find(
    { status: 'active', pushTokens: { $exists: true, $ne: [] } },
    'pushTokens notificationPreferences'
  ).lean();

  // Filter out users who have push.adminBroadcast disabled
  const eligibleTokens = usersWithTokens.reduce((tokens, user) => {
    const pushPrefs = user.notificationPreferences?.push;
    if (pushPrefs && pushPrefs.adminBroadcast === false) {
      return tokens;
    }
    return tokens.concat(user.pushTokens);
  }, []);

  // Log the broadcast intent before sending pushes (ensures log exists even if push fails)
  let broadcastLog;
  try {
    broadcastLog = await BroadcastLog.create({
      title,
      message,
      sentBy,
      recipientCount,
      pushesSent: 0
    });
  } catch (logErr) {
    console.error('BroadcastLog creation failed:', logErr);
  }

  const pushResult = await pushServiceSend({ tokens: eligibleTokens, title, body: message });

  // Update the log with actual push results
  if (broadcastLog) {
    try {
      await BroadcastLog.findByIdAndUpdate(broadcastLog._id, { $set: { pushesSent: pushResult.sent } });
    } catch (updateErr) {
      console.error('BroadcastLog update failed:', updateErr);
    }
  }

  return { recipientCount, pushesSent: pushResult.sent, pushesFailed: pushResult.failed };
};