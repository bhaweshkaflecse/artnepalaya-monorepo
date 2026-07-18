# Google OAuth — Migration Complete

**Status:** ✅ MIGRATION COMPLETE  
**Last Updated:** July 2025

---

## Summary

The Google OAuth implementation has been fully migrated from the Expo Go proxy-based flow (`expo-auth-session`) to native Google Sign-In (`@react-native-google-signin/google-signin`).

This document is retained as a historical reference.

---

## Previous State (Deprecated)

- Used `expo-auth-session/providers/google` with `useIdTokenAuthRequest`
- Only the web client ID was configured
- Authentication flowed through Expo's auth proxy (`auth.expo.io`)
- Limited to Expo Go development environment

## Current State (Production)

- Uses `@react-native-google-signin/google-signin` v12.2.1
- Native Google Sign-In on Android (One Tap capable)
- Requires Firebase project with `google-services.json`
- SHA-1/SHA-256 fingerprints registered in Firebase Console
- Backend verifies tokens against multiple audience client IDs

### Configuration Files

| File | Purpose |
|------|---------|
| `mobile/google-services.json` | Firebase configuration for Android |
| `mobile/app.json` → `plugins` | Google Sign-In plugin configuration |
| `mobile/android/app/build.gradle` | Google Services Gradle plugin |
| `backend/.env` → `GOOGLE_CLIENT_ID` | Backend token verification |
| `backend/.env` → `GOOGLE_ANDROID_CLIENT_ID` | Android audience verification |

### Auth Flow (Current)

```
Mobile: GoogleSignin.signIn()
  → Native Google Sign-In prompt
  → Returns { idToken }
  → POST /api/v1/auth/google { idToken, deviceId }
  → Backend verifies against web + Android client IDs
  → Creates/finds user, generates JWT tokens
  → Returns { user, accessToken, refreshToken, isNewUser }
```

### Backend Verification (auth.service.js)

```javascript
const audience = [env.GOOGLE_CLIENT_ID];
if (env.GOOGLE_ANDROID_CLIENT_ID) audience.push(env.GOOGLE_ANDROID_CLIENT_ID);
if (env.GOOGLE_IOS_CLIENT_ID) audience.push(env.GOOGLE_IOS_CLIENT_ID);

const ticket = await googleClient.verifyIdToken({ idToken, audience });
```

---

## Setup Guide for New Environments

See `mobile/GOOGLE_SIGNIN_SETUP.md` for detailed SHA fingerprint and Firebase configuration instructions.

### Quick Setup

1. Create Firebase project → Add Android app (package: `com.artnepalaya.mobile`)
2. Download `google-services.json` → place at `mobile/google-services.json`
3. Register SHA-1 and SHA-256 fingerprints from your signing keystore in Firebase
4. Set `GOOGLE_CLIENT_ID` (web) and `GOOGLE_ANDROID_CLIENT_ID` in backend `.env`
5. Configure OAuth Consent Screen in Google Cloud Console (app name, logo, URLs)
6. Build with EAS: `eas build --profile preview --platform android`

### Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| "Sign-In Failed" on release APK | SHA fingerprint mismatch | Register EAS signing cert SHA in Firebase |
| Google shows project ID instead of app name | OAuth Consent Screen not configured | Set app name/logo in Google Cloud Console |
| Backend rejects token | Audience mismatch | Ensure GOOGLE_CLIENT_ID matches web client ID |

---

## Historical Migration Notes

The migration was completed across these phases:
1. Replaced `expo-auth-session` with `@react-native-google-signin/google-signin`
2. Added `google-services.json` and Gradle plugin configuration
3. Updated backend to verify multi-audience tokens
4. Removed old `useIdTokenAuthRequest` hook and WebBrowser dependencies
5. Added native Android project configuration (`expo prebuild`)

The old `expo-auth-session` package remains in `package.json` as a transitive dependency but is no longer used directly by application code.
