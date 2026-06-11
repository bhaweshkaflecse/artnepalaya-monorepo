# Google OAuth Migration: EAS Development Build

## Overview

This document explains the migration path from Expo Go proxy-based Google OAuth to native Google Sign-In via EAS Development Builds. The current implementation uses `expo-auth-session` with a web client ID, which works in Expo Go but has limitations in production.

## Current State (Expo Go)

- Uses `expo-auth-session/providers/google` with `useIdTokenAuthRequest`
- Only the **web client ID** (`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`) is configured
- Authentication flows through Expo's auth proxy (`auth.expo.io`)
- Works for development and testing but is not suitable for production App Store / Play Store releases

### Limitations

1. Relies on Expo's proxy server for the OAuth redirect
2. Users see a web-based sign-in flow instead of the native Google prompt
3. Cannot use native Google Sign-In features (One Tap, credential manager)
4. The proxy flow may be deprecated in future Expo SDK versions

## Target State (EAS Development Build)

- Uses `expo-dev-client` for custom development builds
- Enables native Google Sign-In on both iOS and Android
- Requires platform-specific client IDs from Google Cloud Console
- Faster, more reliable, and production-ready

## Migration Steps

### 1. Install `expo-dev-client`

Already added to `mobile/package.json`:

```json
"expo-dev-client": "~3.3.0"
```

### 2. Create Google Cloud OAuth Credentials

In the [Google Cloud Console](https://console.cloud.google.com/apis/credentials):

- **Web Client ID** (already have): Used for the backend token verification
- **iOS Client ID**: Create an OAuth 2.0 Client ID for iOS. Use your app's bundle identifier (e.g., `com.artnepalaya.mobile`)
- **Android Client ID**: Create an OAuth 2.0 Client ID for Android. Use your app's package name and the SHA-1 certificate fingerprint from your keystore

### 3. Update Environment Variables

Add to your `.env` and EAS build secrets:

```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<your-web-client-id>
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<your-ios-client-id>
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=<your-android-client-id>
```

### 4. Update the Google Auth Hook

In `mobile/src/screens/auth/LoginScreen.tsx`, update the hook configuration:

```typescript
const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
  clientId: GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
});
```

### 5. Configure `app.json` / `app.config.js`

Add the Google Sign-In config plugin:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-auth-session"
      ]
    ],
    "ios": {
      "bundleIdentifier": "com.artnepalaya.mobile",
      "infoPlist": {
        "CFBundleURLTypes": [
          {
            "CFBundleURLSchemes": ["com.googleusercontent.apps.<IOS_CLIENT_ID_PREFIX>"]
          }
        ]
      }
    },
    "android": {
      "package": "com.artnepalaya.mobile"
    }
  }
}
```

### 6. Create EAS Build Profile

In `eas.json`:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  }
}
```

### 7. Build the Development Client

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build for iOS simulator
eas build --profile development --platform ios

# Build for Android emulator
eas build --profile development --platform android
```

### 8. Run with Development Build

```bash
# Start the dev server
npx expo start --dev-client
```

## Backend Considerations

The backend (`POST /auth/google`) already verifies Google ID tokens using the web client ID. When using native sign-in:

- The ID token format remains the same
- The `aud` claim in the token will match the platform-specific client ID
- Update the backend's Google token verification to accept all three client IDs:

```javascript
const CLIENT_IDS = [
  process.env.GOOGLE_WEB_CLIENT_ID,
  process.env.GOOGLE_IOS_CLIENT_ID,
  process.env.GOOGLE_ANDROID_CLIENT_ID,
];

const ticket = await client.verifyIdToken({
  idToken,
  audience: CLIENT_IDS,
});
```

## Development Workflow

During the transition period:

1. **Expo Go** still works with the web client ID only (current setup)
2. **Dev Build** enables native flows with platform-specific IDs
3. The `__DEV__` login button provides a fallback for local testing without Google credentials

## Timeline

1. **Phase 1 (Current)**: Web client ID with Expo Go proxy - functional for development
2. **Phase 2**: Add `expo-dev-client`, create platform credentials, build development client
3. **Phase 3**: Test native sign-in flow on physical devices
4. **Phase 4**: Production build with EAS for App Store / Play Store submission
