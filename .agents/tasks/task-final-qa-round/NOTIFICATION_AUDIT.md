# Notification Architecture Audit

## Overview

All notifications flow through a single entry point: `createNotification()` in `backend/src/modules/notifications/notification.service.js`. This function handles in-app persistence, real-time socket emission, and push delivery for all notification types.

---

## Core Architecture

### Entry Point

**File:** `backend/src/modules/notifications/notification.service.js`
**Function:** `createNotification(payload)`
**Parameters:** `{ recipientId, senderId, postId, type, message }`

### Type-to-Preference Mapping (Lines 10-16)

```javascript
const typeToPreferenceKey = {
  Like: 'like',
  Save: 'save',
  Follow: 'follow',
  Comment: 'comment',
  AdminBroadcast: 'adminBroadcast',
  System: 'adminBroadcast',
};
```

Each notification type maps to a key in the user's `notificationPreferences.inApp.*` and `notificationPreferences.push.*` settings.

---

## Notification Flow (All Types)

### Step 1: Self-Notification Guard

```javascript
if (senderId && recipientId.toString() === senderId.toString()) return null;
```

If the sender IS the recipient (e.g., liking your own post), the notification is silently skipped. No in-app, no push, no socket.

### Step 2: Fetch Recipient Preferences

A single DB read fetches the recipient's `pushTokens` and `notificationPreferences`:

```javascript
const recipientPrefs = await User.findById(recipientId)
  .select('pushTokens notificationPreferences')
  .lean();
```

### Step 3: Check In-App Preference

```javascript
const inAppEnabled = !recipientPrefs
  || !recipientPrefs.notificationPreferences?.inApp
  || recipientPrefs.notificationPreferences.inApp[preferenceKey] !== false;
```

Default is **enabled**. Only explicitly set `false` disables it.

### Step 4: Deduplication (Like/Save Only)

For `Like` and `Save` types, a `findOneAndUpdate` checks for existing notifications:

```javascript
const existing = await Notification.findOneAndUpdate(
  { recipientId, senderId, postId, type },
  { $set: { isRead: false, createdAt: new Date() } },
  { new: true }
);
```

If a duplicate exists:
- The existing notification is refreshed (marked unread, timestamp updated)
- Socket `NOTIFICATION_COUNT_CHANGED` is emitted (if inApp enabled)
- **NO push notification is sent** (re-likes/re-saves do not push)
- Function returns early

### Step 5: Create In-App Notification (if enabled)

```javascript
const notification = await Notification.create({ recipientId, senderId, postId, type, message });
```

### Step 6: Emit Socket Event

```javascript
const unreadCount = await Notification.countDocuments({ recipientId, isRead: false });
emitToUser(recipientId.toString(), EVENTS.NOTIFICATION_COUNT_CHANGED, { unreadCount });
```

**File:** `backend/src/realtime/emitter.js`
**Function:** `emitToUser(userId, eventName, payload)` - emits to Socket.IO room `user:{userId}`

**File:** `backend/src/realtime/events.js`
**Event:** `EVENTS.NOTIFICATION_COUNT_CHANGED = 'notification.count.changed'`

### Step 7: Send Push Notification (if enabled)

Non-blocking call to `sendPushForNotificationWithPrefs()`:

1. Checks `recipient.notificationPreferences.push[preferenceKey] !== false`
2. Verifies `recipient.pushTokens` array is non-empty
3. Resolves sender username for human-readable body text
4. Calls `pushServiceSend({ tokens, title, body, data })`

**File:** `backend/src/shared/services/pushService.js`
**Function:** `send({ tokens, title, body, data })`

Push service flow:
1. Filters tokens via `Expo.isExpoPushToken()` validation
2. Builds messages with `sound: 'default'`
3. Chunks via `expo.chunkPushNotifications()`
4. Sends via `expo.sendPushNotificationsAsync()`
5. After 15s delay, checks receipts and removes `DeviceNotRegistered` tokens from the user's `pushTokens` array

---

## Per-Type Behavior

### Follow Notifications

| Aspect | Behavior |
|--------|----------|
| Trigger | `post.service.js` or follow controller calls `createNotification({ type: 'Follow' })` |
| Self-guard | Skipped if sender === recipient |
| Deduplication | **None** - every follow creates a new notification |
| In-App | Created if `notificationPreferences.inApp.follow !== false` |
| Socket | `notification.count.changed` emitted with updated unread count |
| Push title | "New Follower" |
| Push body | "{username} started following you" |
| Push check | `notificationPreferences.push.follow !== false` |

### Like Notifications

| Aspect | Behavior |
|--------|----------|
| Trigger | `post.service.js addLike()` calls `createNotification({ type: 'Like', postId })` |
| Self-guard | Skipped if sender === recipient (liking own post) |
| Deduplication | **Yes** - `findOneAndUpdate({ recipientId, senderId, postId, type: 'Like' })` |
| Re-like behavior | Refreshes existing notification (unread, new timestamp). NO new push sent. |
| In-App | Created if `notificationPreferences.inApp.like !== false` |
| Socket | `notification.count.changed` emitted with updated unread count |
| Push title | "New Like" |
| Push body | "{username} liked your artwork" |
| Push check | `notificationPreferences.push.like !== false` |

### Save Notifications

| Aspect | Behavior |
|--------|----------|
| Trigger | `post.service.js addSave()` calls `createNotification({ type: 'Save', postId })` |
| Self-guard | Skipped if sender === recipient (saving own post) |
| Deduplication | **Yes** - same dedup logic as Like |
| Re-save behavior | Refreshes existing notification (unread, new timestamp). NO new push sent. |
| In-App | Created if `notificationPreferences.inApp.save !== false` |
| Socket | `notification.count.changed` emitted with updated unread count |
| Push title | "New Save" |
| Push body | "{username} saved your artwork" |
| Push check | `notificationPreferences.push.save !== false` |

### Comment Notifications

| Aspect | Behavior |
|--------|----------|
| Trigger | Comment creation calls `createNotification({ type: 'Comment', postId })` |
| Self-guard | Skipped if sender === recipient |
| Deduplication | **None** - each comment creates a new notification |
| In-App | Created if `notificationPreferences.inApp.comment !== false` |
| Socket | `notification.count.changed` emitted with updated unread count |
| Push title | "New Comment" |
| Push body | "{username} commented on your artwork" |
| Push check | `notificationPreferences.push.comment !== false` |

---

## Summary Table

| Type | In-App | Push | Socket Event | Dedup | Notes |
|------|--------|------|--------------|-------|-------|
| Follow | Yes (if pref enabled) | Yes (if pref + tokens) | `notification.count.changed` | No | Every follow generates a new notification |
| Like | Yes (if pref enabled) | Yes (first time only) | `notification.count.changed` | Yes | Re-likes refresh existing, no new push |
| Save | Yes (if pref enabled) | Yes (first time only) | `notification.count.changed` | Yes | Re-saves refresh existing, no new push |
| Comment | Yes (if pref enabled) | Yes (if pref + tokens) | `notification.count.changed` | No | Each comment is unique |
| AdminBroadcast | Yes (batch insert) | Yes (all eligible users) | N/A | No | Uses separate `broadcastNotification()` function |

---

## Key Files Referenced

| File | Purpose |
|------|---------|
| `backend/src/modules/notifications/notification.service.js` | Core notification logic, preference checks, dedup |
| `backend/src/shared/services/pushService.js` | Expo push token validation, chunked sending, receipt cleanup |
| `backend/src/realtime/emitter.js` | Socket.IO emission helper (`emitToUser`) |
| `backend/src/realtime/events.js` | Event name constants (`NOTIFICATION_COUNT_CHANGED`) |
| `backend/src/modules/posts/post.service.js` | Triggers Like/Save notifications from interaction handlers |

---

## Edge Cases and Observations

1. **Push-only mode:** If inApp is disabled but push is enabled, the function still sends push (independent check).
2. **No tokens:** If user has no `pushTokens` array or it is empty, push is silently skipped.
3. **Invalid tokens:** `pushService.js` filters invalid tokens via `Expo.isExpoPushToken()` before sending.
4. **Token cleanup:** DeviceNotRegistered tokens are automatically removed from the user document after receipt checking (15s delay).
5. **Non-blocking push:** Push is fire-and-forget (`.catch()` on the promise). A push failure does not affect in-app notification creation.
6. **Socket room convention:** Users join room `user:{userId}` on connection; notifications are emitted to that room.
