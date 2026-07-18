# Art Nepalaya — Engineering Handoff Document

**Last Updated:** July 2025  
**Branch:** `fix/final-stabilization`  
**Purpose:** Complete context for continuing development in a new session.

---

## 1. Project Overview

Art Nepalaya is Nepal's first social art discovery platform. It connects artists, art lovers, galleries, and creative businesses through an intelligent, algorithm-driven feed system.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | Expo SDK 50, React Native 0.73.6, Redux Toolkit, Socket.IO Client |
| Backend | Node.js 22, Express (ES Modules), Mongoose, Redis, Socket.IO, Cloudinary |
| Admin | Vite, React, TypeScript, Tailwind CSS, Zustand |
| Database | MongoDB (primary), Redis (cache + sessions) |
| Media | Cloudinary |
| Auth | Native Google Sign-In (`@react-native-google-signin/google-signin`) |
| Push | Expo Push + FCM |
| Deployment | Docker Compose on Ncell Cloud (Ubuntu 24.04), Cloudflare DNS |
| Builds | EAS Build (Expo Application Services) |

### Production URLs

| Domain | Purpose |
|--------|---------|
| `artnepalaya.com` | Marketing website (cPanel, separate server) |
| `api.artnepalaya.com` | Backend API + Socket.IO |
| `admin.artnepalaya.com` | Admin Panel |
| `app.artnepalaya.com` | Share pages, deep links, Android App Links |

---

## 2. Current State (as of latest commit)

### ✅ Working

- Google Sign-In (native, production)
- Guest mode with limited access
- 4-step user onboarding (Role → About You → Interests → Mature Content)
- Post creation with multi-media upload + artwork type categorization
- Home feed with multi-signal recommendation engine
- Explore with server-side filtering by artwork type + search
- Follow system
- Like / Save / Share
- Push notifications (backend pipeline verified, client delivery under investigation)
- Real-time notifications via Socket.IO
- Admin panel (all features)
- Share pages with Open Graph + deep linking
- Recommendation Engine admin module (simulation, score inspection)
- Android App Links (intent:// scheme)
- Cloudinary image optimization (with existing-transform detection)
- Redis cache with wildcard invalidation
- Content moderation (NSFW, soft delete, ban/suspend)

### ⚠️ Under Investigation

- Push notification delivery to device (backend sends successfully, client presentation under investigation)
- Recommendation engine integration (verifying which code path the production feed uses for specific users)

### Architecture Decisions

1. **Feed Ranking:** Pluggable signal registry with 13 signals, configurable weights via AppConfig
2. **Artwork Types:** Admin-managed, dynamically consumed by onboarding, create, explore, and feed
3. **Share URLs:** `app.artnepalaya.com/p/<id>` with intent:// deep linking
4. **SecureStore:** All reads/writes use safe wrappers (never crash on decryption failure)
5. **Notification Groups:** Aggregated notifications with push cooldown and preference controls

---

## 3. Key Files & Entry Points

### Backend
- `src/server.js` — Server startup (MongoDB, Redis, PostgreSQL, Cloudinary, Socket.IO)
- `src/app.js` — Express app (middleware chain, route mounting, share routes)
- `src/modules/posts/recommendation.service.js` — Feed ranking engine (signal registry)
- `src/modules/posts/post.service.js` — Post CRUD, getFeed, getExplore
- `src/modules/notifications/notification.service.js` — Grouped notifications + push delivery
- `src/modules/share/share.routes.js` — Public share landing pages (HTML)
- `src/middlewares/validator.js` — Zod validation (IMPORTANT: all new Post fields must be added to createPostSchema)

### Mobile
- `App.tsx` — Provider setup, NavigationContainer with deep linking config
- `src/navigation/AppStack.tsx` — Main navigator, push token re-registration, Socket.IO
- `src/screens/auth/LoginScreen.tsx` — Google Sign-In, push registration after login
- `src/services/pushNotification.service.ts` — Push registration pipeline (8 stages)
- `src/services/api.ts` — Axios with token refresh interceptor
- `src/utils/secureStore.ts` — Safe read/write/delete wrappers
- `src/utils/media.ts` — Cloudinary URL optimization (handles existing transforms)
- `src/store/slices/feedSlice.ts` — Feed state management

### Admin
- `src/pages/RecommendationEngine.tsx` — Feed simulation + score inspection
- `src/pages/ArtworkTypes.tsx` — Manage artwork types (name, active, sort order)
- `src/pages/PushNotifications.tsx` — Broadcast notifications

---

## 4. Critical Patterns

### Adding a New Post Field

When adding a new field to the Post model:
1. Add to `post.model.js` schema
2. Add to **BOTH** `createPostSchema` AND `updatePostSchema` in `post.validation.js` (with z.preprocess if it arrives as form-data string)
3. Add parsing in `post.service.js` createPost if needed
4. Update `Post` TypeScript interface in `mobile/src/services/post.service.ts`

**WARNING:** If you forget step 2, Zod silently strips the field. This caused the artworkType bug that took multiple debugging cycles to find.

### Feed Code Paths

```
GET /posts/feed
  ├── Authenticated + has interests → buildRecommendedFeed() [recommendation engine]
  ├── Authenticated + NO interests → buildFeedQuery() [LEGACY: likes*3 + saves*5]
  └── Guest → buildFeedQuery() [LEGACY]
```

The admin simulation uses `buildExploreFeed()` as fallback (different from production). This is a known architectural inconsistency documented for future resolution.

### Push Notification Pipeline

```
Login → registerForPushNotifications(accessToken)
  Stage 1: Device check
  Stage 2: Android channel
  Stage 3: Permission check
  Stage 4: Permission request
  Stage 5: Project ID
  Stage 6: getExpoPushTokenAsync
  Stage 7: POST /users/me/push-token
  Stage 8: Complete

AppState 'active' → re-registers token (once per session)
```

### SecureStore Safety

ALL SecureStore operations use safe wrappers from `src/utils/secureStore.ts`:
- `safeGetItemAsync(key)` — returns null on decryption failure
- `safeSetItemAsync(key, value)` — returns false on write failure
- `safeDeleteItemAsync(key)` — returns false on delete failure
- `safeGetOrCreateDeviceId()` — always returns a valid device ID

---

## 5. Temporary Diagnostic Logging (To Be Removed)

The following files contain temporary diagnostic logging that should be removed or gated behind a debug flag after the current stabilization is verified:

- `backend/src/middlewares/validator.js` — PRE/POST Zod logging for POST /posts
- `backend/src/modules/posts/post.service.js` — artworkType parsing + explore sample docs
- `backend/src/modules/posts/post.controller.js` — createPost request logging
- `backend/src/modules/posts/recommendation.service.js` — getUserFeedSignals interests logging
- `mobile/src/screens/create/CreateScreen.tsx` — artworkType FormData append logging

---

## 6. Known Technical Debt

1. Legacy feed fallback (`buildFeedQuery`) should be replaced with `buildExploreFeed` for consistency
2. `expo-dev-client` in package.json (required for Expo workflow, EAS strips for production)
3. Pagination drift in recommendation engine (documented, accepted for MVP)
4. `assetlinks.json` has TODO placeholder SHA-256 fingerprint
5. Some diagnostic console.logs remain (awaiting final runtime verification)
6. Notification icon uses adaptive-icon.png as placeholder (needs proper monochrome icon)

---

## 7. How to Continue Development

1. Pull `fix/final-stabilization` branch
2. Read this document + `PRD.md` for full context
3. Check the "Under Investigation" section above for current open items
4. Follow the engineering workflow: Requirements → Design → Implement → Self Review → Runtime Verify → Document → Merge
5. Update documentation in the same PR as code changes
