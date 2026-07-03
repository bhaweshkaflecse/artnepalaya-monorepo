# Push Notifications Pipeline Audit

## Overview

This document traces the complete push notification pipeline from token generation on the mobile device to notification delivery via Expo's push service.

---

## 1. Token Generation

**File:** `mobile/src/services/pushNotification.service.ts`

- Uses `expo-notifications` library
- Calls `Notifications.getExpoPushTokenAsync()` to obtain an Expo push token
- Only works on **physical devices** (not simulators/emulators)
- Requires notification permissions to be granted first
- Permission is requested via `Notifications.requestPermissionsAsync()` before token generation

**Flow:**
1. Check if device is physical (`Device.isDevice`)
2. Request notification permissions
3. If granted, call `getExpoPushTokenAsync()` to get the token string
4. Return the token for registration

---

## 2. Token Storage

**Mobile side:** Calls `notificationService.registerPushToken(token)` which sends a POST request to `/users/me/push-token` with the token in the request body.

**Backend side:** `user.controller.js` has a `registerPushToken` handler that:
- Receives the token from the authenticated request
- Stores the token in the user's `pushTokens` array field
- Prevents duplicate tokens (checks if token already exists before adding)
- Persists to MongoDB

**Endpoint:** `POST /users/me/push-token`
**Auth:** Requires authenticated user (JWT token in Authorization header)

---

## 3. Token Registration Timing

**Location:** `LoginScreen` - called after successful authentication

**Trigger:** Inside `handleAuthSuccess` callback, after `setCredentials` dispatch completes

**Sequence:**
1. User authenticates via Google OAuth
2. `setCredentials` is dispatched to Redux store (stores JWT in SecureStore)
3. `registerForPushNotifications()` is called
4. This is **fire-and-forget** -- uses `.catch(err => console.warn(...))` pattern
5. Token POST requires auth header, which works because SecureStore already has the JWT by this point

**Key timing consideration:** The token registration happens AFTER credentials are stored in SecureStore. Since the API call reads the auth token from SecureStore (via the API interceptor), the POST to `/users/me/push-token` will have valid authentication. This ordering is correct.

**Note:** The `handleDevLogin` path previously also called this, but dev login has been removed from production.

---

## 4. Delivery Mechanism

**File:** `backend/src/shared/utils/pushNotifications.js`

- Imports `Expo` from `expo-server-sdk`
- Creates an Expo SDK client instance
- For each notification to send:
  1. Validates tokens using `Expo.isExpoPushToken(token)`
  2. Constructs message objects with `{ to, title, body, data }` fields
  3. Chunks messages using `expo.chunkPushNotifications(messages)`
  4. Sends each chunk via `expo.sendPushNotificationsAsync(chunk)`
- Handles errors per-chunk (logs failures but continues with remaining chunks)

**Message format:**
```javascript
{
  to: expoPushToken,
  sound: 'default',
  title: notificationTitle,
  body: notificationBody,
  data: { /* custom payload */ }
}
```

---

## 5. Triggering

**File:** `backend/src/services/notification.service.js`

- When a notification event occurs (new like, comment, follow, etc.), the service:
  1. Creates an in-app notification record in MongoDB
  2. Queries for all users who should receive the push notification
  3. Filters to users who have `pushTokens` field that exists and is not empty
  4. Collects all tokens from those users' `pushTokens` arrays
  5. Calls the push notification utility to send to all collected tokens

**Query pattern:** Finds users where `pushTokens` exists and has at least one entry, then sends the notification to every token in every matching user's array.

---

## 6. Known Issues and Timing Considerations

### Token Expiry
- Expo push tokens can become invalid if the app is uninstalled/reinstalled
- No mechanism currently removes stale tokens from the `pushTokens` array
- Failed deliveries are logged but tokens are not pruned

### Multiple Devices
- A user can have multiple tokens (one per device)
- All tokens in the `pushTokens` array receive the notification
- This is correct behavior for multi-device support

### Race Condition (Theoretical)
- If the token registration POST fails silently (fire-and-forget), the user will not receive push notifications until next login
- Network issues during the brief window between auth and token registration could cause this

### Simulator/Emulator
- Push tokens cannot be generated on non-physical devices
- `Device.isDevice` check prevents crashes but means dev testing requires physical hardware or Expo Go on a real device

### Permission Denied
- If the user denies notification permissions, no token is generated
- No retry mechanism exists -- user must re-grant permissions and re-login (or trigger registration from elsewhere)

---

## Pipeline Summary

```
[Mobile Device]
    |
    v
1. getExpoPushTokenAsync() -- generates device-specific Expo token
    |
    v
2. POST /users/me/push-token -- stores token in user.pushTokens[]
    |
    v
[Event occurs on backend - like, comment, follow]
    |
    v
3. notification.service.js -- queries users with pushTokens
    |
    v
4. pushNotifications.js -- validates tokens, chunks, sends via Expo SDK
    |
    v
5. Expo Push Service -- delivers to APNs/FCM
    |
    v
[Device receives notification]
```
