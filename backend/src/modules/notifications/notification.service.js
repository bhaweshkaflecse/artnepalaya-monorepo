import { Notification } from './notification.model.js';
import { NotificationGroup } from './notificationGroup.model.js';
import { getNotificationConfig } from './notificationConfig.js';
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

/**
 * Determines targetType and targetId based on notification type and payload.
 * - Like/Save/Comment -> targetType:'Post', targetId:postId
 * - Follow -> targetType:null, targetId:null (group all follows to same recipient)
 * - AdminBroadcast/System -> targetType:'System', targetId:null
 */
function resolveTarget(type, postId) {
  if (type === 'Like' || type === 'Save' || type === 'Comment') {
    return { targetType: 'Post', targetId: postId || null };
  }
  if (type === 'Follow') {
    return { targetType: null, targetId: null };
  }
  // AdminBroadcast, System, and other types
  return { targetType: 'System', targetId: null };
}

/**
 * Groupable types that aggregate within a time window.
 */
const GROUPABLE_TYPES = new Set(['Like', 'Save', 'Follow', 'Comment']);

/**
 * Creates or updates a grouped notification.
 * Backward-compatible signature: createNotification({recipientId, senderId, postId, type, message})
 *
 * For groupable types (Like, Save, Follow, Comment):
 *   - Finds an existing active group within the time window
 *   - If found: increments actorCount, appends sender to recentActors
 *   - If not found: creates a new group
 *
 * For non-groupable types (AdminBroadcast, System):
 *   - Always creates independent groups
 *
 * Push cooldown: only sends push if elapsed time since lastPushSentAt > cooldown.
 * Socket: emits NOTIFICATION_UPDATED with populated group + NOTIFICATION_COUNT_CHANGED.
 */
export const createNotification = async (payload) => {
  const { recipientId, senderId, postId, type, message } = payload;

  // Self-notification check
  if (senderId && recipientId.toString() === senderId.toString()) return null;

  // Load config
  const config = await getNotificationConfig();

  // Look up recipient preferences for inApp and push checks
  const preferenceKey = typeToPreferenceKey[type];
  let recipientPrefs = null;
  if (preferenceKey) {
    recipientPrefs = await User.findById(recipientId)
      .select('pushTokens notificationPreferences')
      .lean();
  }

  // Check if inApp is enabled for this notification type
  const inAppEnabled = !recipientPrefs
    || !recipientPrefs.notificationPreferences?.inApp
    || recipientPrefs.notificationPreferences.inApp[preferenceKey] !== false;

  // If inApp is disabled but push might still be enabled, handle push-only path
  if (!inAppEnabled) {
    await handlePushDelivery(null, recipientPrefs, recipientId, senderId, type, message, config);
    return null;
  }

  const { targetType, targetId } = resolveTarget(type, postId);
  let group;

  if (GROUPABLE_TYPES.has(type)) {
    // Find or create a group within the time window
    const windowMs = config.groupingWindows[type];
    const windowStart = windowMs ? new Date(Date.now() - windowMs) : new Date(0);

    // Build the query to find an active group
    const groupQuery = {
      recipientId,
      type,
      targetId: targetId || null,
      groupCreatedAt: { $gte: windowStart }
    };

    // Try to update an existing group atomically.
    // Uses $addToSet for recentActors to make actor append idempotent (no race condition).
    // $inc actorCount by 1 on every interaction; this may slightly overcount for
    // repeated actors (like/unlike/re-like) but the difference is negligible for display.
    const updateOps = {
      $inc: { actorCount: 1 },
      $set: {
        latestActivityAt: new Date(),
        isRead: false,
        message: message || undefined
      }
    };
    // Only add to recentActors if we have a valid senderId
    if (senderId) {
      updateOps.$addToSet = { recentActors: senderId };
    }

    const existingGroup = await NotificationGroup.findOneAndUpdate(
      groupQuery,
      updateOps,
      { new: true, sort: { groupCreatedAt: -1 } }
    );

    if (existingGroup) {
      // Trim recentActors to maxRecentActors if it exceeded the limit
      const maxActors = config.maxRecentActors || 5;
      if (existingGroup.recentActors.length > maxActors) {
        await NotificationGroup.findByIdAndUpdate(existingGroup._id, {
          $set: {
            recentActors: existingGroup.recentActors.slice(-maxActors)
          }
        });
        existingGroup.recentActors = existingGroup.recentActors.slice(-maxActors);
      }
      group = existingGroup;
    } else {
      // Create a new group
      group = await NotificationGroup.create({
        recipientId,
        type,
        targetType,
        targetId: targetId || null,
        actorCount: 1,
        recentActors: senderId ? [senderId] : [],
        latestActivityAt: new Date(),
        isRead: false,
        lastPushSentAt: null,
        groupCreatedAt: new Date(),
        title: null,
        message: message || null
      });
    }
  } else {
    // Non-groupable types: always create an independent group
    group = await NotificationGroup.create({
      recipientId,
      type,
      targetType,
      targetId: targetId || null,
      actorCount: 0,
      recentActors: [],
      latestActivityAt: new Date(),
      isRead: false,
      lastPushSentAt: null,
      groupCreatedAt: new Date(),
      title: message || null,
      message: message || null
    });
  }

  // Emit socket events
  await emitGroupSocketEvents(group, recipientId);

  // Handle push delivery with cooldown
  await handlePushDelivery(group, recipientPrefs, recipientId, senderId, type, message, config);

  return group;
};

/**
 * Emits NOTIFICATION_UPDATED and NOTIFICATION_COUNT_CHANGED socket events.
 */
async function emitGroupSocketEvents(group, recipientId) {
  try {
    // Populate group data for the client
    // Note: recipientId is intentionally NOT populated - the client already knows who it is.
    // targetId IS populated so socket-delivered notifications include post media/title.
    const populatedGroup = await NotificationGroup.findById(group._id)
      .populate('recentActors', 'username avatarUrl')
      .populate({ path: 'targetId', select: 'media title', model: 'Post' })
      .lean();

    emitToUser(
      recipientId.toString(),
      EVENTS.NOTIFICATION_UPDATED,
      populatedGroup
    );
  } catch (err) {
    console.error('[NotificationService] Error emitting NOTIFICATION_UPDATED:', err.message);
  }

  // Emit unread count
  try {
    const unreadCount = await NotificationGroup.countDocuments({
      recipientId,
      isRead: false
    });
    emitToUser(
      recipientId.toString(),
      EVENTS.NOTIFICATION_COUNT_CHANGED,
      { unreadCount }
    );
  } catch (err) {
    console.error('[NotificationService] Error emitting unread count:', err.message);
  }
}

/**
 * Handles push delivery with cooldown logic.
 * Only sends push if (now - lastPushSentAt) > cooldown for the type.
 * Updates lastPushSentAt on the group after sending.
 */
async function handlePushDelivery(group, recipientPrefs, recipientId, senderId, type, message, config) {
  try {
    const preferenceKey = typeToPreferenceKey[type];
    if (!preferenceKey) return;

    // Fetch recipient prefs if not already loaded
    const recipient = recipientPrefs || await User.findById(recipientId)
      .select('pushTokens notificationPreferences')
      .lean();

    if (!recipient || !recipient.pushTokens || recipient.pushTokens.length === 0) {
      return;
    }

    // Check if push is enabled for this notification type
    const pushPrefs = recipient.notificationPreferences?.push;
    if (pushPrefs && pushPrefs[preferenceKey] === false) {
      return;
    }

    // Check cooldown
    if (group) {
      const cooldownMs = config.pushCooldowns[type];
      if (cooldownMs && cooldownMs > 0 && group.lastPushSentAt) {
        const elapsed = Date.now() - new Date(group.lastPushSentAt).getTime();
        if (elapsed < cooldownMs) {
          // Within cooldown, skip push
          return;
        }
      }
    }

    // Build push title and body
    const title = typeToTitle[type] || 'ArtNepalaya';
    let body = message || `You have a new ${type.toLowerCase()} notification`;

    // Hoist sender lookup above both branches to avoid double DB query
    let sender = null;
    if (senderId) {
      sender = await User.findById(senderId).select('username').lean();
    }

    // If we have a sender, build a descriptive message
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

    // Include actor count in body for grouped notifications
    if (group && group.actorCount > 1 && sender && sender.username) {
      const othersCount = group.actorCount - 1;
      if (type === 'Like') {
        body = `${sender.username} and ${othersCount} other${othersCount > 1 ? 's' : ''} liked your artwork`;
      } else if (type === 'Save') {
        body = `${sender.username} and ${othersCount} other${othersCount > 1 ? 's' : ''} saved your artwork`;
      } else if (type === 'Follow') {
        body = `${sender.username} and ${othersCount} other${othersCount > 1 ? 's' : ''} started following you`;
      } else if (type === 'Comment') {
        body = `${sender.username} and ${othersCount} other${othersCount > 1 ? 's' : ''} commented on your artwork`;
      }
    }

    await pushServiceSend({
      tokens: recipient.pushTokens,
      title,
      body,
      data: { type, senderId: senderId ? senderId.toString() : null }
    });

    // Update lastPushSentAt on the group
    if (group) {
      await NotificationGroup.findByIdAndUpdate(group._id, {
        $set: { lastPushSentAt: new Date() }
      });
    }
  } catch (err) {
    console.error('[PushService] Push delivery error:', err.message || err);
  }
}

/**
 * Retrieves paginated user notifications from NotificationGroup.
 * Populates recentActors with username and avatarUrl.
 * Conditionally populates targetId if targetType is 'Post'.
 * Sorted by latestActivityAt descending.
 */
export const getUserNotifications = async (userId, page, limit, filter = 'all') => {
  const skip = (page - 1) * limit;
  const query = { recipientId: userId };

  if (filter === 'unread') {
    query.isRead = false;
  } else if (filter === 'read') {
    query.isRead = true;
  }

  const [notifications, totalItems, unreadCount] = await Promise.all([
    NotificationGroup.find(query)
      .sort({ latestActivityAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('recentActors', 'username avatarUrl')
      .populate({
        path: 'targetId',
        select: 'media title',
        model: 'Post',
      })
      .lean()
      .then((groups) => {
        // Set targetId to null for non-Post types (populate may resolve to null anyway)
        return groups.map((g) => {
          if (g.targetType !== 'Post') {
            g.targetId = null;
          }
          return g;
        });
      }),
    NotificationGroup.countDocuments(query),
    NotificationGroup.countDocuments({ recipientId: userId, isRead: false })
  ]);

  const totalPages = Math.ceil(totalItems / limit);
  return {
    data: notifications,
    meta: {
      currentPage: page,
      limit,
      totalItems,
      totalPages,
      unreadCount,
      hasNextPage: page < totalPages
    }
  };
};

/**
 * Marks all notification groups as read for a user.
 */
export const markAllAsRead = async (userId) => {
  await NotificationGroup.updateMany(
    { recipientId: userId, isRead: false },
    { $set: { isRead: true } }
  );
  return true;
};

/**
 * Marks a single notification group as read.
 * Validates that the group belongs to the requesting user.
 */
export const markOneAsRead = async (userId, notificationId) => {
  const group = await NotificationGroup.findOneAndUpdate(
    { _id: notificationId, recipientId: userId, isRead: false },
    { $set: { isRead: true } },
    { new: true }
  );
  if (!group) {
    const err = new Error('Notification not found');
    err.statusCode = 404;
    throw err;
  }
  return group;
};

/**
 * Broadcasts a notification to all active users by creating individual
 * NotificationGroup documents (type: AdminBroadcast, targetType: System).
 * Push is sent immediately (cooldown = 0 for broadcasts).
 * BroadcastLog creation and push stats tracking are preserved.
 */
export const broadcastNotification = async (title, message, sentBy = null) => {
  const BATCH_SIZE = 500;
  let recipientCount = 0;
  let skip = 0;
  let batch;

  do {
    batch = await User.find({ status: 'active' }, '_id').lean().skip(skip).limit(BATCH_SIZE);
    if (batch.length > 0) {
      const groups = batch.map((user) => ({
        recipientId: user._id,
        type: 'AdminBroadcast',
        targetType: 'System',
        targetId: null,
        actorCount: 0,
        recentActors: [],
        latestActivityAt: new Date(),
        isRead: false,
        lastPushSentAt: null,
        groupCreatedAt: new Date(),
        title,
        message
      }));
      await NotificationGroup.insertMany(groups);
      recipientCount += groups.length;
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

  // Update lastPushSentAt for all broadcast groups (immediate push)
  await NotificationGroup.updateMany(
    { type: 'AdminBroadcast', title, groupCreatedAt: { $gte: new Date(Date.now() - 60000) } },
    { $set: { lastPushSentAt: new Date() } }
  );

  return { recipientCount, pushesSent: pushResult.sent, pushesFailed: pushResult.failed };
};
