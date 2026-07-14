# Google Sign-In Setup Guide

This document covers the complete setup for Google Sign-In in the ArtNepalaya mobile app, including Firebase configuration, SHA-1 fingerprints, and troubleshooting.

## Prerequisites

- Firebase project created at [Firebase Console](https://console.firebase.google.com)
- Google Cloud Console access for OAuth configuration
- EAS CLI installed (`npm install -g eas-cli`)

---

## 1. Get SHA-1 Fingerprints

### Debug Keystore (Local Development)

```bash
# From mobile/android directory
keytool -list -v -keystore app/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Look for `SHA1:` in the output (e.g., `AA:BB:CC:DD:...`).

### EAS Build Keystore (Production/Preview)

```bash
# Get the credentials for Android builds
eas credentials --platform android

# Select your project, then "Keystore" to view SHA-1
# Or use the fingerprint command:
eas credentials -p android --profile production
```

If you have the `.jks` file locally:

```bash
keytool -list -v -keystore /path/to/your-keystore.jks -alias your-alias
```

### Important

You need BOTH SHA-1 fingerprints registered in Firebase:
- The debug SHA-1 (for local development and debug builds)
- The EAS/production SHA-1 (for release builds via EAS Build)

---

## 2. Firebase Console Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select or create your project
3. Click **Add app** and choose **Android**
4. Enter package name: `com.artnepalaya.mobile`
5. Enter SHA-1 fingerprints (add BOTH debug and production)
6. Download `google-services.json`
7. Place it at `mobile/google-services.json` (the `app.json` config `googleServicesFile: "./google-services.json"` handles copying during EAS build)

### Adding Additional SHA-1 Fingerprints

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Under **Your apps**, find the Android app
3. Click **Add fingerprint**
4. Paste the SHA-1 value
5. Download the updated `google-services.json` and replace the existing file

---

## 3. Google Cloud Console - OAuth Client ID

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select the project linked to your Firebase project
3. Navigate to **APIs & Services** > **Credentials**
4. You should see auto-created OAuth client IDs from Firebase:
   - **Web client** (type: Web application) - used as `webClientId` in the app
   - **Android client** (type: Android) - one per SHA-1 fingerprint

### Configure the Web Client ID

The `webClientId` is required for the React Native Google Sign-In library:

1. Find the **Web client** (auto created by Google Service) in OAuth 2.0 Client IDs
2. Copy its **Client ID** (looks like: `123456789-abcdef.apps.googleusercontent.com`)
3. Set it as the `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` environment variable

### Verify Android Client IDs

Ensure there is an Android OAuth client for each SHA-1 fingerprint:
- One for the debug keystore SHA-1
- One for the EAS production keystore SHA-1

These are usually auto-created by Firebase when you add fingerprints.

---

## 4. Fill in google-services.json

The `mobile/google-services.json` file should be downloaded directly from Firebase Console. Key values it contains:

- `project_info.project_number` - Your Firebase project number
- `project_info.firebase_url` - Your Realtime Database URL (if used)
- `project_info.project_id` - Your Firebase project ID
- `client[0].client_info.mobilesdk_app_id` - Firebase App ID
- `client[0].oauth_client` - OAuth client entries (Web + Android)
- `client[0].api_key` - Firebase API key

**Never commit real credentials to version control.** Use EAS Secrets or environment variables for production builds.

---

## 5. Environment Variables

Set these in your EAS build secrets or `.env` file:

| Variable | Description | Where to find |
|----------|-------------|---------------|
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Web OAuth Client ID | Google Cloud Console > Credentials > Web client |

### For EAS Build Secrets

```bash
# Set the web client ID as an EAS secret
eas secret:create --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value "your-client-id.apps.googleusercontent.com" --scope project
```

### For Release Signing (keystore.properties)

Create `mobile/android/keystore.properties` (not committed to git):

```properties
storeFile=path/to/your-release-keystore.jks
storePassword=your-store-password
keyAlias=your-key-alias
keyPassword=your-key-password
```

---

## 6. Troubleshooting

### DEVELOPER_ERROR (Error Code 10)

This is the most common issue. It means the SHA-1 fingerprint of the signing key does not match what is registered in Firebase.

**Causes:**
- Building with a keystore whose SHA-1 is not in Firebase
- Using EAS Build but only registering the debug keystore SHA-1
- The `google-services.json` is outdated (download fresh from Firebase after adding fingerprints)

**Fix:**
1. Get the SHA-1 of your build keystore (see Section 1)
2. Add it to Firebase Console (see Section 2)
3. Re-download `google-services.json` and replace in project
4. Rebuild the app

### SHA-1 Mismatch

If Google Sign-In works in debug but not in release:

1. The release build uses a different keystore than debug
2. Get the release keystore SHA-1: `eas credentials -p android`
3. Add that SHA-1 to Firebase Console
4. Re-download `google-services.json`

### "Sign in failed" with no error code

- Verify `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is set and correct
- Ensure you are using the **Web client** ID, not an Android client ID
- Check that Google Sign-In API is enabled in Google Cloud Console

### Play Store App Signing

If you use Google Play App Signing (recommended for Play Store distribution):

1. Go to Google Play Console > Your App > Setup > App signing
2. Copy the **App signing key certificate** SHA-1
3. Add this SHA-1 to Firebase Console
4. This is different from your upload key SHA-1

### Clearing Cache

After updating `google-services.json`, clean and rebuild:

```bash
cd mobile/android
./gradlew clean
cd ..
npx expo run:android
```

---

## Quick Checklist

- [ ] Firebase project created with Android app (`com.artnepalaya.mobile`)
- [ ] Debug keystore SHA-1 added to Firebase
- [ ] EAS/production keystore SHA-1 added to Firebase
- [ ] Play Store App Signing SHA-1 added to Firebase (if using Play Store)
- [ ] `google-services.json` downloaded from Firebase and placed at `mobile/google-services.json`
- [ ] `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` set (Web client ID from Cloud Console)
- [ ] `keystore.properties` created for local release builds (not committed)
- [ ] Google Sign-In API enabled in Google Cloud Console
- [ ] App rebuilt after any configuration changes
