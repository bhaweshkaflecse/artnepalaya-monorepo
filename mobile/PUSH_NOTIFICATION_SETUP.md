# Push Notification Setup (FCM Required)

## Why This Is Needed

Expo push notifications on Android **require Firebase Cloud Messaging (FCM)** to deliver notifications to physical devices. Without FCM:
- `getExpoPushTokenAsync()` will throw an error on production/preview builds
- The Expo push service cannot route notifications to the Android device
- Admin broadcasts will show "Push notifications sent: 0"

## Setup Steps

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project" or select an existing project
3. Follow the wizard (you can disable Google Analytics)

### 2. Add an Android App

1. In your Firebase project, click "Add app" → Android
2. Enter package name: `com.artnepalaya.mobile`
3. Enter app nickname: "Art Nepalaya"
4. You do NOT need to enter SHA-1 fingerprint for push notifications only
5. Click "Register app"

### 3. Download google-services.json

1. After registering, download `google-services.json`
2. Replace the placeholder file at `mobile/google-services.json` with your real file
3. Verify the `package_name` inside matches `com.artnepalaya.mobile`

### 4. Get the FCM Server Key (for Expo)

**Option A: FCM V1 (Recommended)**
1. In Firebase Console → Project Settings → Cloud Messaging tab
2. Note your "Sender ID" (this is the project_number in google-services.json)
3. Go to [Expo Dashboard](https://expo.dev) → Your Project → Credentials → Android
4. Upload your FCM V1 service account key (download from Firebase Console → Project Settings → Service Accounts → Generate New Private Key)

**Option B: Legacy FCM Key (Deprecated but still works)**
1. Firebase Console → Project Settings → Cloud Messaging
2. Copy the "Server Key" (legacy)
3. Go to Expo Dashboard → Your Project → Credentials → Android → FCM Server Key
4. Paste the key

### 5. Rebuild the APK

```bash
eas build --profile preview --platform android
```

The new build will include the Firebase configuration and push tokens will be generated successfully.

### 6. Verify

After installing the new APK:
1. Sign in with Google
2. Check Logcat for `[PushReg] Stage 6/8: PASS`
3. Check admin panel → Push Notifications → "Users with tokens" should be > 0
4. Send a broadcast → device should receive the notification

## Troubleshooting

- **Stage 6 fails with "SENDER_ID_MISMATCH"**: The google-services.json project doesn't match the FCM key configured in Expo Dashboard
- **Stage 6 fails with "MISSING_INSTANCEID_SERVICE"**: Google Play Services not available on the device
- **Stage 7 fails with 401**: The access token expired before push registration completed
- **Token is generated but broadcasts show 0 sent**: FCM server key not configured in Expo Dashboard
