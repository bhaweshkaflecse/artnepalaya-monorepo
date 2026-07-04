import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Notification } from '../modules/notifications/notification.model.js';
import { NotificationGroup } from '../modules/notifications/notificationGroup.model.js';
import { getNotificationConfig } from '../modules/notifications/notificationConfig.js';

/**
 * Migration script: Converts existing flat Notification documents into
 * grouped NotificationGroup documents.
 *
 * Features:
 * - Processes notifications in batches of 500
 * - Groups by {recipientId, type, postId} within 24-hour time windows
 * - AdminBroadcast/System types remain as individual groups (not aggregated)
 * - Preserves isRead status (group is unread if ANY notification in it was unread)
 * - Idempotent: skips if NotificationGroup collection already has documents
 * - Does NOT delete the old Notification collection (kept as backup)
 *
 * Usage: node backend/src/scripts/migrateNotifications.js
 */

const BATCH_SIZE = 500;

async function migrateNotifications() {
  try {
    await mongoose.connect(env.MONGO_URI);
    console.log('[Migration] Connected to MongoDB');

    // Idempotency check: skip if NotificationGroup already has documents
    const existingCount = await NotificationGroup.countDocuments();
    if (existingCount > 0) {
      console.log(`[Migration] NotificationGroup collection already has ${existingCount} documents. Skipping migration.`);
      console.log('[Migration] To re-run, manually clear the NotificationGroup collection first.');
      return;
    }

    const config = await getNotificationConfig();
    const defaultWindow = 86400000; // 24 hours fallback

    const totalNotifications = await Notification.countDocuments();
    console.log(`[Migration] Found ${totalNotifications} notifications to process`);

    if (totalNotifications === 0) {
      console.log('[Migration] No notifications to migrate. Done.');
      return;
    }

    // Track groups being built: key -> group data
    // Key format: `${recipientId}:${type}:${targetId}:${windowStart}`
    const groupMap = new Map();
    let processed = 0;

    // Process in batches sorted by createdAt ascending (oldest first)
    let lastId = null;
    let hasMore = true;

    while (hasMore) {
      const query = lastId ? { _id: { $gt: lastId } } : {};
      const batch = await Notification.find(query)
        .sort({ _id: 1 })
        .limit(BATCH_SIZE)
        .lean();

      if (batch.length === 0) {
        hasMore = false;
        break;
      }

      for (const notif of batch) {
        const recipientId = notif.recipientId.toString();
        const type = notif.type;
        const createdAt = new Date(notif.createdAt).getTime();

        // AdminBroadcast and System notifications are individual groups
        if (type === 'AdminBroadcast' || type === 'System') {
          const groupKey = `${recipientId}:${type}:individual:${notif._id}`;
          groupMap.set(groupKey, {
            recipientId: notif.recipientId,
            type,
            targetType: 'System',
            targetId: null,
            actorCount: notif.senderId ? 1 : 0,
            recentActors: notif.senderId ? [notif.senderId] : [],
            latestActivityAt: notif.createdAt,
            isRead: notif.isRead,
            lastPushSentAt: null,
            groupCreatedAt: notif.createdAt,
            title: notif.title || null,
            message: notif.message || null
          });
          continue;
        }

        // Determine target info
        const targetId = notif.postId ? notif.postId.toString() : 'none';
        const targetType = notif.postId ? 'Post' : (type === 'Follow' ? 'User' : null);

        // Get the grouping window for this type
        const windowMs = config.groupingWindows[type] || defaultWindow;

        // Find an existing group within the time window
        const groupPrefix = `${recipientId}:${type}:${targetId}`;
        let matchedKey = null;

        for (const [key, group] of groupMap) {
          if (!key.startsWith(groupPrefix)) continue;
          const groupStart = new Date(group.groupCreatedAt).getTime();
          if (createdAt >= groupStart && createdAt <= groupStart + windowMs) {
            matchedKey = key;
            break;
          }
        }

        if (matchedKey) {
          // Add to existing group
          const group = groupMap.get(matchedKey);
          group.actorCount += 1;
          group.latestActivityAt = notif.createdAt;

          // Add sender to recentActors (keep last N unique actors)
          if (notif.senderId) {
            const senderStr = notif.senderId.toString();
            const existingActors = group.recentActors.map(a => a.toString());
            if (!existingActors.includes(senderStr)) {
              group.recentActors.push(notif.senderId);
              if (group.recentActors.length > config.maxRecentActors) {
                group.recentActors = group.recentActors.slice(-config.maxRecentActors);
              }
            }
          }

          // If any notification is unread, the group is unread
          if (!notif.isRead) {
            group.isRead = false;
          }
        } else {
          // Create a new group
          const windowStart = createdAt;
          const newKey = `${groupPrefix}:${windowStart}`;
          groupMap.set(newKey, {
            recipientId: notif.recipientId,
            type,
            targetType,
            targetId: notif.postId || null,
            actorCount: 1,
            recentActors: notif.senderId ? [notif.senderId] : [],
            latestActivityAt: notif.createdAt,
            isRead: notif.isRead,
            lastPushSentAt: null,
            groupCreatedAt: notif.createdAt,
            title: notif.title || null,
            message: notif.message || null
          });
        }
      }

      lastId = batch[batch.length - 1]._id;
      processed += batch.length;
      console.log(`[Migration] Processed ${processed}/${totalNotifications} notifications`);
    }

    // Insert all groups in batches
    const groups = Array.from(groupMap.values());
    console.log(`[Migration] Created ${groups.length} notification groups from ${totalNotifications} notifications`);

    if (groups.length > 0) {
      const insertBatchSize = 500;
      for (let i = 0; i < groups.length; i += insertBatchSize) {
        const insertBatch = groups.slice(i, i + insertBatchSize);
        await NotificationGroup.insertMany(insertBatch);
        console.log(`[Migration] Inserted groups ${i + 1} to ${Math.min(i + insertBatchSize, groups.length)}`);
      }
    }

    console.log('[Migration] Migration complete!');
    console.log(`[Migration] Original Notification collection preserved as backup (${totalNotifications} documents).`);

  } catch (error) {
    console.error('[Migration] Failed:', error.message);
    console.error(error.stack);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

migrateNotifications();
