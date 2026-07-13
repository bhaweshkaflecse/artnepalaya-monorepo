# ArtNepalaya Release Checklist

This document is the standard release guide for deploying ArtNepalaya to production. Follow each section sequentially to ensure a complete and verified deployment.

---

## 1. Production Deployment Checklist

- [ ] All code merged to the release branch and tagged
- [ ] No development-only UI visible (dev login, debug buttons)
- [ ] All console.log statements gated behind `__DEV__` (production builds emit only console.error)
- [ ] Environment variables configured for production (see section 3)
- [ ] Backend smoke-tested on staging before production deploy
- [ ] Admin panel built with production API URL
- [ ] Mobile app built with production API URL
- [ ] DNS records verified for all production domains

---

## 2. Docker Deployment Steps

### Backend

```bash
cd backend
docker build -t artnepalaya-backend:latest .
docker run -d \
  --name artnepalaya-backend \
  --env-file .env.production \
  -p 5000:5000 \
  artnepalaya-backend:latest
```

### Admin Panel

```bash
cd admin
docker build -t artnepalaya-admin:latest .
docker run -d \
  --name artnepalaya-admin \
  -p 3000:80 \
  artnepalaya-admin:latest
```

### Verify Containers

```bash
docker ps
docker logs artnepalaya-backend --tail 50
docker logs artnepalaya-admin --tail 50
```

---

## 3. Environment Variable Checklist

### Backend (.env.production)

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port (default: 5000) | Yes |
| `MONGODB_URI` | MongoDB Atlas connection string | Yes |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | Yes |
| `JWT_REFRESH_SECRET` | Refresh token signing secret | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth web client ID | Yes |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Yes |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Yes |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Yes |
| `EXPO_ACCESS_TOKEN` | Expo push notification access token | Yes |
| `NODE_ENV` | Must be `production` | Yes |
| `CORS_ORIGIN` | Allowed origins (comma-separated) | Yes |

### Mobile (app.json / EAS environment)

| Variable | Description | Required |
|----------|-------------|----------|
| `EXPO_PUBLIC_API_URL` | Production API base URL: `https://api.artnepalaya.com/api/v1` | Yes |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google OAuth web client ID | Yes |

### Admin Panel (.env.production)

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Production API base URL: `https://api.artnepalaya.com/api/v1` | Yes |

---

## 4. Database Seeding Checklist

- [ ] MongoDB Atlas cluster accessible from production server IP
- [ ] Database indexes created (users.email unique, posts.createdAt descending)
- [ ] Admin user seeded:
  ```bash
  node backend/src/scripts/seedAdmin.js
  ```
- [ ] Artwork types seeded:
  ```bash
  node backend/src/scripts/seedArtworkTypes.js
  ```
- [ ] CMS pages seeded (privacy policy, terms, about, etc.):
  ```bash
  node backend/src/scripts/seedCmsPages.js
  ```
- [ ] Verify seed data:
  ```bash
  mongosh "$MONGODB_URI" --eval "db.users.countDocuments({role: 'admin'})"
  ```

---

## 5. SSL Renewal Notes

### Current Setup

- Domain: `artnepalaya.com`, `api.artnepalaya.com`, `admin.artnepalaya.com`
- SSL Provider: Let's Encrypt (auto-renewal via certbot) or hosting provider managed
- Certificate type: Wildcard or per-subdomain

### Renewal Process

```bash
# If using certbot:
sudo certbot renew --dry-run
sudo certbot renew

# Verify expiry:
echo | openssl s_client -servername api.artnepalaya.com -connect api.artnepalaya.com:443 2>/dev/null | openssl x509 -noout -dates
```

### Important Notes

- Set calendar reminder 14 days before expiry
- Test renewal in staging first
- Restart nginx/reverse-proxy after renewal if not using auto-reload
- Monitor with uptime service (UptimeRobot, Pingdom, etc.)

---

## 6. Cloudinary Verification

- [ ] Upload test image via admin panel and confirm it appears in Cloudinary dashboard
- [ ] Verify transformation URLs resolve (thumbnails, optimized versions)
- [ ] Check upload preset configuration matches backend expectations
- [ ] Confirm `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` are set
- [ ] Test image deletion via admin panel
- [ ] Verify storage quota is within limits

---

## 7. Google OAuth Verification

- [ ] Google Cloud Console project is set to production
- [ ] OAuth consent screen is verified (or in testing with approved test users)
- [ ] Authorized redirect URIs include production domain
- [ ] `GOOGLE_CLIENT_ID` matches the Web application client ID
- [ ] Android SHA-1 fingerprint registered for production keystore
- [ ] Test Google Sign-In on:
  - [ ] Android physical device
  - [ ] Login completes and user record is created in MongoDB
  - [ ] Token refresh works after initial login

---

## 8. Push Notification Verification

- [ ] `EXPO_ACCESS_TOKEN` is set in backend environment
- [ ] Expo project ID in `app.json`: `bb44fc58-146f-4483-b61f-c9b7edbad4e6`
- [ ] Verify push registration pipeline:
  1. User logs in via Google
  2. Backend logs: `[PushToken] POST /users/me/push-token HIT`
  3. Backend logs: MongoDB write SUCCESS
  4. MongoDB user document contains `pushTokens: [ExpoPushToken[...]]`
- [ ] Verify push delivery:
  1. Send broadcast notification from Admin Dashboard
  2. Admin shows "Users with tokens: N" (N >= 1)
  3. Notification received on physical Android device
- [ ] Verify push independence:
  - [ ] Login succeeds even if push permission is denied
  - [ ] Login succeeds even if push registration fails
  - [ ] App functions normally without push token

---

## 9. Mobile Preview APK Checklist

- [ ] Build preview APK:
  ```bash
  eas build --platform android --profile preview
  ```
- [ ] Install on test device
- [ ] Verify all screens load without crash
- [ ] Test Google Login flow
- [ ] Test Guest Login flow
- [ ] Test push notification receipt
- [ ] Test image upload (post creation)
- [ ] Test authentication media carousel on login screen
- [ ] Verify no dev login button visible
- [ ] Check for any console errors in adb logcat

---

## 10. Production APK Checklist

- [ ] Increment `versionCode` and `version` in `app.json`
- [ ] Build production APK/AAB:
  ```bash
  eas build --platform android --profile production
  ```
- [ ] Sign with production keystore
- [ ] Test on clean device (no prior install)
- [ ] Verify no debug artifacts (logs, dev menu, dev login)
- [ ] Submit to Google Play Console (if applicable)
- [ ] Monitor crash reports for first 24 hours

---

## 11. Admin Panel Verification

- [ ] Admin panel accessible at `https://admin.artnepalaya.com`
- [ ] Admin login works with seeded credentials
- [ ] Dashboard displays correct statistics
- [ ] User management: list, view, edit roles
- [ ] Post management: list, moderate, delete
- [ ] Auth media management: upload, reorder, delete
- [ ] CMS page management: edit, publish
- [ ] Push notification broadcast: compose, send, verify delivery
- [ ] Artwork type management: add, edit, reorder, toggle active

---

## 12. Final QA Checklist

### Authentication

- [ ] Google Login: success, token stored, push registered
- [ ] Guest Login: no crash, SecureStore safe, navigation correct
- [ ] Logout: tokens cleared, redirected to login screen
- [ ] Token refresh: seamless re-authentication on 401

### Core Features

- [ ] Home Feed: posts load, infinite scroll works, pull-to-refresh
- [ ] Create Post: image upload, caption, artwork type selection, publish
- [ ] Profile: view own profile, edit profile, view others' profiles
- [ ] Follow/Unfollow: updates follower count in real-time

### Push Notifications

- [ ] Notification received on device after broadcast
- [ ] Notification tapped opens correct screen
- [ ] Badge count updates correctly

### Authentication Media

- [ ] Admin uploads new auth media
- [ ] Mobile app shows updated carousel on login screen
- [ ] Old cached images are not displayed (cache-busting works)

### Performance

- [ ] App startup under 3 seconds on mid-range device
- [ ] Feed scrolling smooth (no jank)
- [ ] Image loading with proper placeholders
- [ ] No memory leaks on long usage sessions

### Security

- [ ] No hardcoded secrets in client code
- [ ] API responses do not leak sensitive data
- [ ] JWT tokens have reasonable expiry
- [ ] CORS configured correctly (only allowed origins)
- [ ] File uploads validated (type, size)
- [ ] No SQL/NoSQL injection vectors
- [ ] Rate limiting on auth endpoints

### Production URLs

- [ ] `https://artnepalaya.com` - loads correctly
- [ ] `https://api.artnepalaya.com` - health check responds
- [ ] `https://admin.artnepalaya.com` - admin panel loads

### Caching

- [ ] Auth media: Cache-Control: no-cache, must-revalidate
- [ ] Static assets: proper cache headers (long TTL with version hash)
- [ ] API responses: no unintended caching of dynamic data

---

## Production URLs

| Service | URL |
|---------|-----|
| Main App | https://artnepalaya.com |
| API | https://api.artnepalaya.com |
| Admin Panel | https://admin.artnepalaya.com |

---

## Emergency Rollback

If critical issues are discovered post-deploy:

1. Revert to previous Docker image tag
2. Restore database from latest backup (if schema changed)
3. Clear CDN cache if static assets are affected
4. Notify team in communication channel

```bash
docker stop artnepalaya-backend
docker run -d --name artnepalaya-backend --env-file .env.production -p 5000:5000 artnepalaya-backend:<previous-tag>
```

---

## Runtime Verification Notes

Items 5 (Production Verification) and 6 (Authentication Media) from the user requirements require physical device testing:

- **Push notification end-to-end**: The code path is confirmed correct. `registerForPushNotifications(accessToken)` is called as fire-and-forget after auth success. It uses an explicit Authorization header (bypasses the interceptor). The backend endpoint `/users/me/push-token` writes to MongoDB. Full verification requires a real Android device with Google Play Services and an active Expo push token.

- **Auth media cache freshness**: The backend returns `Cache-Control: no-cache, no-store, must-revalidate` headers. The mobile client appends `?t=<timestamp>` for cache-busting. Full verification requires uploading new media in admin and confirming the mobile app reflects changes immediately.

Both code paths are production-ready. Physical device verification should be performed before marking the release as GA.
