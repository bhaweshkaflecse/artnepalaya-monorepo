# Art Nepalaya — Release Checklist

**Last Updated:** July 2025  
**Infrastructure:** Ncell Cloud (Ubuntu 24.04), Cloudflare DNS, Docker Compose

---

## Pre-Deployment Verification

- [ ] All features runtime-verified on real device
- [ ] No development-only UI visible in production builds
- [ ] Diagnostic logging removed or gated behind debug flag
- [ ] `PRD.md` and `ENGINEERING_HANDOFF.md` updated
- [ ] No `CHANGE_ME` or `TODO` placeholders in production configs
- [ ] Release branch is stable (no known crashes)

---

## 1. Backend Deployment (Ncell Cloud)

### Pull & Deploy

```bash
ssh user@ncell-server
cd /path/to/artnepalaya-monorepo
git pull origin fix/final-stabilization

cd backend
docker-compose -f docker-compose.prod.yml up -d --build
```

### Verify Services

```bash
docker ps                              # All containers running
docker logs art_backend --tail 30      # No startup errors
curl https://api.artnepalaya.com/health  # Returns {"status":"OK"}
```

### Post-Deployment

- [ ] Backend health check passes
- [ ] MongoDB connected
- [ ] Redis connected
- [ ] Socket.IO initialized
- [ ] Admin panel accessible at admin.artnepalaya.com
- [ ] Share pages render at app.artnepalaya.com/p/<postId>

---

## 2. Environment Variables (Backend)

| Variable | Required | Notes |
|----------|----------|-------|
| `PORT` | ✅ | 8080 |
| `NODE_ENV` | ✅ | `production` |
| `CORS_ORIGIN` | ✅ | Include all production domains |
| `MONGO_URI` | ✅ | Production MongoDB connection string |
| `REDIS_URL` | ✅ | Production Redis with password |
| `JWT_ACCESS_SECRET` | ✅ | Min 32 chars, unique |
| `JWT_REFRESH_SECRET` | ✅ | Min 32 chars, different from access |
| `GOOGLE_CLIENT_ID` | ✅ | Web client ID from Google Cloud |
| `GOOGLE_ANDROID_CLIENT_ID` | ✅ | Android client ID |
| `CLOUDINARY_CLOUD_NAME` | ✅ | Production Cloudinary |
| `CLOUDINARY_API_KEY` | ✅ | Production Cloudinary |
| `CLOUDINARY_API_SECRET` | ✅ | Production Cloudinary |

---

## 3. Mobile APK Build

### Prerequisites

- [ ] EAS CLI installed (`npm install -g eas-cli`)
- [ ] Logged in (`eas login` as `erbhaweshkafle`)
- [ ] `mobile/google-services.json` is the REAL Firebase config (not placeholder)
- [ ] `mobile/.env.production` has correct `EXPO_PUBLIC_API_URL`

### Build Commands

```bash
cd mobile

# Preview APK (for testing)
eas build --profile preview --platform android

# Production AAB (for Play Store)
eas build --profile production --platform android
```

### Post-Build Verification

- [ ] APK installs on physical device
- [ ] Google Sign-In works
- [ ] Feed loads
- [ ] Post creation works with artwork type
- [ ] Push notifications arrive (if FCM configured)

---

## 4. Firebase & FCM Configuration

- [ ] Firebase project exists for `com.artnepalaya.mobile`
- [ ] `google-services.json` downloaded and placed at `mobile/google-services.json`
- [ ] SHA-1 from EAS signing cert registered in Firebase Console
- [ ] SHA-256 from EAS signing cert registered in Firebase Console
- [ ] FCM V1 service account key uploaded to Expo Dashboard → Credentials → Android

### Get SHA fingerprints

```bash
eas credentials --platform android
# Look for SHA-1 and SHA-256 fingerprints
```

---

## 5. DNS & SSL (Cloudflare)

| Record | Type | Value |
|--------|------|-------|
| `api.artnepalaya.com` | A | Server IP |
| `admin.artnepalaya.com` | A | Server IP |
| `app.artnepalaya.com` | A | Server IP |

- [ ] SSL certificates valid (managed by Cloudflare or Certbot)
- [ ] HTTPS working on all subdomains
- [ ] HTTP → HTTPS redirect working

---

## 6. Android App Links Verification

- [ ] `assetlinks.json` deployed at `app.artnepalaya.com/.well-known/assetlinks.json`
- [ ] SHA-256 fingerprint in assetlinks.json matches APK signing cert
- [ ] Verify on device: `adb shell pm get-app-links com.artnepalaya.mobile`
- [ ] Result should show `app.artnepalaya.com: verified`

---

## 7. Database Seeding (First Deploy Only)

```bash
docker exec art_backend npm run seed:all:clear
```

**Admin credentials after seeding:** `admin@artnepalaya.com` / `admin123`

⚠️ `seed:all:clear` DROPS all existing data. Only use on fresh deployments.

---

## 8. Google OAuth Branding

- [ ] Google Cloud Console → OAuth Consent Screen configured:
  - App name: "Art Nepalaya"
  - Logo uploaded
  - Homepage: `https://artnepalaya.com`
  - Privacy Policy: `https://artnepalaya.com/privacy`
  - Terms of Service: `https://artnepalaya.com/terms`
  - Support email set
  - Developer contact email set
- [ ] No project IDs visible to end users during sign-in

---

## 9. Push Notification Verification

After deployment + APK build:

1. Login on device → check backend logs for `[PushToken] POST /users/me/push-token HIT`
2. Admin Panel → Push Notifications → verify "Users with tokens: > 0"
3. Send test broadcast → verify device receives notification
4. Check notification icon appears correctly (monochrome white)

---

## 10. Post-Deployment Smoke Test

| Test | Expected |
|------|----------|
| Google Sign-In | Successful login, user created |
| Guest mode | Browse feed, 15-post limit |
| Create post with artwork type | Post appears in Profile + Explore |
| Explore → category filter | Returns matching posts |
| Share post → open link | Landing page with artwork preview |
| Pull-to-refresh Home | Fresh posts appear |
| Admin → Broadcast | Notification reaches device |
| Admin → Recommendation Engine | Score breakdown displays |

---

## 11. Rollback Procedure

```bash
# If deployment fails:
cd backend
git checkout <previous-stable-commit>
docker-compose -f docker-compose.prod.yml up -d --build

# If mobile APK has critical bug:
# Cannot rollback distributed APKs.
# Push a hotfix and rebuild immediately.
```

---

## 12. Known Limitations (Current Release)

- Push notification client delivery under investigation
- Legacy feed fallback for users without interests (doesn't use recommendation engine)
- `assetlinks.json` SHA-256 needs manual update per signing cert
- iOS not yet supported (Android-first MVP)
- Expo SDK 50 alpha — monitor for stability
