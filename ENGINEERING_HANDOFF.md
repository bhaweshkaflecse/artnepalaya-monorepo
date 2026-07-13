# ArtNepalaya — Engineering Handoff Document

**Generated:** 2025-07-05
**Purpose:** Complete context for continuing development in a new chat session.

---

## 1. Project Overview

### What Is ArtNepalaya?

A digital platform for Nepalese arts and culture connecting artists, art lovers, galleries, businesses, and creative professionals. It includes:

- **Mobile App** — Expo React Native (Android-first, iOS later)
- **Backend API** — Node.js + Express (ES Modules)
- **Admin Panel** — Vite + React + TypeScript + Tailwind CSS
- **Infrastructure** — Docker (Nginx, MongoDB, Redis, Backend, Admin) on Contabo VPS

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | Expo SDK 50 (alpha), React Native 0.73.6, Redux Toolkit, Socket.IO Client |
| Backend | Node.js, Express, Mongoose (MongoDB), Redis, Socket.IO, Cloudinary, expo-server-sdk |
| Admin | Vite, React, TypeScript, Tailwind CSS |
| Database | MongoDB (primary), Redis (caching + sessions) |
| Media | Cloudinary (images + video hosting) |
| Auth | Google Sign-In (native via @react-native-google-signin/google-signin) |
| Push | Expo Push Notifications (expo-server-sdk on backend) |
| Deployment | Docker Compose on Contabo VPS, EAS Build for mobile |

### Repository Structure

```
artnepalaya-monorepo/
├── backend/
│   ├── src/
│   │   ├── modules/        (auth, posts, users, admin, notifications, community, reports, tags, taxonomy)
│   │   ├── middlewares/    (authGuard, upload, validator, security)
│   │   ├── shared/         (utils: cache, pushNotifications; services: pushService)
│   │   ├── realtime/       (socketServer, emitter, events)
│   │   ├── scripts/        (seed, seedAll, migrateNotifications)
│   │   ├── config/         (env, cloudinary)
│   │   └── server.js, app.js
│   ├── nginx/              (nginx.conf, nginx.prod.conf)
│   ├── docker-compose.yml, docker-compose.prod.yml
│   └── package.json
├── mobile/
│   ├── src/
│   │   ├── screens/        (auth, home, post, profile, create, explore, community, onboarding, notifications, settings)
│   │   ├── components/     (home/PostCard, common/*)
│   │   ├── navigation/     (RootNavigator, AppStack, AuthStack, MainTabs)
│   │   ├── store/          (Redux: authSlice, feedSlice, userSlice, appSlice, notificationSlice)
│   │   ├── services/       (api, auth, post, user, notification, pushNotification, socket, config)
│   │   ├── theme/          (colors)
│   │   └── utils/          (media)
│   ├── assets/             (icon.png, splash.png, loginimage.png, icons/Flag_of_Nepal.png)
│   ├── App.tsx, app.json, eas.json, package.json
│   └── tsconfig.json
├── admin/
│   └── src/pages/          (Dashboard, Posts, Users, Featured, CmsEditor, Moderation, etc.)
└── ENGINEERING_HANDOFF.md  (this file)
```

### Branch

**`fix/final-stabilization`** — all work happens here.

### Deployment

| Environment | URL |
|-------------|-----|
| Production API | https://api.artnepalaya.com |
| Production Admin | https://admin.artnepalaya.com |
| Production Website | https://artnepalaya.com |

- **Cloudflare DNS** configured
- **SSL** working (Cloudflare edge)
- **Nginx** reverse proxy inside Docker
- **CORS:** `https://artnepalaya.com, https://admin.artnepalaya.com, https://api.artnepalaya.com`

---

## 2. Current Repository State

- **Branch:** `fix/final-stabilization`
- **Latest commit:** `a70be90` — "feat(mobile): lazy video mount, Cloudinary image optimization, FlatList performance"
- **Total backend files:** 77
- **Total mobile files:** 50 (TypeScript/TSX)
- **Total admin files:** 17

### Key Recent Commits (this QA cycle)

```
a70be90 feat(mobile): lazy video mount, Cloudinary image optimization, FlatList performance
334cb7a fix(backend): add investigation logging to push-token registration endpoint
6cd406f fix(api): prevent repeated API calls on render/re-render
18c8712 fix(onboarding): replace SvgXml Nepal flag with Image PNG asset
07265d7 fix(video): enforce no-autoplay policy
d169964 feat(ui): home refresh, post sharing, explore search, create polish, community icons
96bee6b fix(login): update brand text, stats icons, guest CTA
d657082 fix(push+video): fix token race condition, disable video autoplay
```

---

## 3. Completed Features

### Authentication
- Native Google Sign-In (`@react-native-google-signin/google-signin`)
- Google account picker (signOut before signIn)
- Guest login (immediate, fire-and-forget SecureStore)
- Backend admin login (password: `SuperAdmin##5656#$$@`)
- Token refresh with interceptor
- AppInitializer pattern (no auth flash on startup)
- **Files:** `LoginScreen.tsx`, `App.tsx`, `auth.service.js`, `authSlice.ts`

### Notification System (Grouped Architecture)
- `NotificationGroup` model with time-windowed aggregation
- Configurable grouping windows (24h default) and push cooldowns (5-10min)
- Config stored in AppConfig with 60s TTL cache
- PushService with receipt checking and invalid token cleanup
- Socket.IO real-time updates (`notification.updated`, `notification.count.changed`)
- Admin broadcast with batch insert + push delivery
- Per-user notification preferences (push + inApp toggles)
- Mobile Redux slice with 100-entry cap and upsert logic
- **Files:** `notificationGroup.model.js`, `notificationConfig.js`, `notification.service.js`, `pushService.js`, `notificationSlice.ts`, `NotificationsScreen.tsx`

### Feed & Recommendation
- 80/20 preference/discovery split for users with interests
- Configurable weights in AppConfig (`feed_recommendation_weights`)
- Popularity scoring: likes*3 + saves*5 + recencyBonus(max 10)
- Fallback to chronological+popularity for guests/no-preferences
- NSFW filtering for non-opted-in users
- `artworkType` filter REMOVED (was excluding most posts)
- **Files:** `recommendation.service.js`, `post.service.js`

### User Onboarding
- 3-screen marketing onboarding (OnboardingScreen) → Get Started → AuthStack
- UserPreferenceSetup: 3-step wizard (Role → About You → Interests)
- `isNewUser` flag from backend triggers preference setup
- Optional with Skip/Complete Later
- **Files:** `OnboardingScreen.tsx`, `UserPreferenceSetup.tsx`, `RootNavigator.tsx`, `appSlice.ts`

### Profile
- Profile picture upload/change/remove (Cloudinary)
- Contact info: Website, WhatsApp, Phone with social media URL blocking
- Username editing with 7-day cooldown + uniqueness validation
- Sub-roles editing with chip UI
- Art Interests editing (dynamic from `/config/artwork-types`)
- **Files:** `EditProfileScreen.tsx`, `ProfileScreen.tsx`, `UserProfileScreen.tsx`, `user.service.js`

### Upload/Create
- CreateSelectorScreen: Creative Post, Community Post (Coming Soon), Marketplace Post (Coming Soon)
- CreateScreen: "Creative Post" header, Caption, Tags, Post Category, simplified Content Declaration
- Multi-media upload (5 images + 1 video) with progress indicator
- Post-publish redirect to Home
- **Files:** `CreateSelectorScreen.tsx`, `CreateScreen.tsx`

### Admin Panel
- User search (debounced, fullName support)
- CMS with 8 pages (including Data Policy, Information Policy)
- Posts: likes/saves columns, media count badge, hover preview, carousel modal
- Dashboard: Top 10/50/100/500 filters, Post/User ID copy buttons
- Featured: configurable limit (10), consistent validation
- Moderation: Post ID column + copy button
- Notification config editor
- Read-only user interests display
- **Files:** `Users.tsx`, `Posts.tsx`, `Dashboard.tsx`, `Featured.tsx`, `Moderation.tsx`, `CmsEditor.tsx`, `PushNotifications.tsx`

### Infrastructure
- Production domains configured (api.artnepalaya.com, admin.artnepalaya.com)
- Docker Compose with Nginx, Backend, Admin, MongoDB, Redis
- EAS build profiles (development, preview, production)
- Super admin: `artneptechnical@gmail.com`
- Default 18+ preference (showMatureContent: true)

---

## 4. Remaining Issues

### Critical Release Blockers

#### Push Notifications — Zero Tokens in MongoDB
- **Status:** NOT WORKING
- **Evidence:** Backend logs: `[PushService] No tokens provided, skipping send`
- **Investigation:** 8-stage `[PushReg]` logging added. Code passes accessToken explicitly. projectId set correctly.
- **Unknown:** Whether `getExpoPushTokenAsync()` succeeds on the physical device
- **Next step:** User must check Logcat for `[PushReg] Stage 1-8` output after login on physical device

#### Video Performance — App Still Laggy
- **Status:** PARTIALLY FIXED (latest commit `a70be90` adds lazy Video mount)
- **Latest implementation:** Video component only mounts when user taps Play. Thumbnail shown initially. React.memo on PostCard. FlatList tuning (windowSize=5, maxToRenderPerBatch=3). Cloudinary image transforms.
- **Unknown:** Whether the latest APK has been tested with commit `a70be90`
- **Next step:** Build APK from HEAD and test

### High Priority

#### Nepal Flag — SVG Not Rendering Directly
- **Status:** Currently uses `Flag_of_Nepal.png` (Image component)
- **Required:** Use `Flag_of_Nepal.svg` directly as single source of truth
- **Blocked by:** Needs `react-native-svg-transformer` + metro config (user must run npm install)
- **Next step:** User adds transformer, metro config prepared in code

### Medium Priority

#### Feed Performance — Cloudinary Images
- **Status:** Latest commit adds `/w_750,q_auto,f_auto/` transforms
- **Needs verification:** Whether transformed URLs are visibly loading faster

### Future Phase (Deferred)

- Explore: Related Posts (requires backend recommendation by post)
- Comments system
- Video analytics (watch time, completion rate)
- Email notifications
- Background job queue (BullMQ)
- Weekly digest
- Notification preferences UI on mobile

---

## 5. Push Notification Investigation

### Current Implementation Flow

```
LoginScreen.tsx → handleAuthSuccess() → registerForPushNotifications(accessToken)
  → pushNotification.service.ts → registerForPushNotifications(accessToken?)
    → Stage 1: Device.isDevice check
    → Stage 2: Android channel setup
    → Stage 3: getPermissionsAsync()
    → Stage 4: requestPermissionsAsync() if needed
    → Stage 5: Resolve projectId (Constants.expoConfig.extra.eas.projectId || fallback)
    → Stage 6: getExpoPushTokenAsync({ projectId })
    → Stage 7: POST /users/me/push-token { token } with Authorization header
    → Stage 8: Complete
```

### Backend Flow

```
POST /users/me/push-token (authGuard) → user.controller.js → registerPushToken
  → user.service.js → User.findByIdAndUpdate(userId, { $addToSet: { pushTokens: token } })
```

### What Has Been Ruled Out

- Race condition with SecureStore (FIXED — token passed explicitly)
- Missing projectId (FIXED — set via Constants fallback)
- Authentication header missing (FIXED — passed explicitly)
- Backend endpoint missing (EXISTS — verified in routes)
- MongoDB write logic (CORRECT — $addToSet)

### What Is Still Unknown

1. Whether `getExpoPushTokenAsync()` succeeds on the physical APK
2. Whether the POST request reaches the backend at all
3. Whether there's a Google Services / FCM configuration issue with the EAS build

### Current Backend Logs

```
[PushService] Attempting to send to 0 tokens
[PushService] No tokens provided, skipping send
```

Plus new investigation logging at endpoint (commit `334cb7a`):
```
[PushToken] Endpoint HIT...
[PushToken] Token received: ...
[PushToken] MongoDB write success
```

### Acceptance Criteria

Push notifications are NOT fixed until ALL of these are verified:
1. Notification permission granted ✅
2. Expo Push Token generated (visible in Logcat)
3. POST /users/me/push-token successfully reaches backend (visible in backend logs)
4. Token stored in MongoDB (`db.users.findOne({...}, { pushTokens: 1 })`)
5. Admin broadcast sends to registered devices
6. Physical Android device receives actual OS notification

---

## 6. Video Performance Investigation

### Current Implementation (commit `a70be90`)

- PostCard: Shows Cloudinary thumbnail (Image). Only mounts Video component when user taps Play.
- PostDetailScreen: Shows thumbnail. Video mounts on tap.
- Both: `shouldPlay=false` on mount, toggled only by user tap, pause on blur/unmount.
- FlatList: `windowSize={5}`, `maxToRenderPerBatch={3}`, `getItemLayout` with estimated height.
- Images: Cloudinary URL transform `/w_750,q_auto,f_auto/` for feed.
- React.memo on PostCard.

### Why App May Still Feel Laggy

1. **Expo SDK 50 alpha** — alpha SDK may have performance issues
2. **Large image downloads** — if Cloudinary transforms aren't being applied correctly
3. **Multiple PostCard instances re-rendering** — despite React.memo, if post objects aren't referentially stable
4. **Video poster loading** — fetching video thumbnails from Cloudinary adds network requests

### Acceptance Criteria

- No autoplay
- Tap to play/pause
- Muted by default
- Smooth 60fps scrolling
- No OOM crashes
- No background audio

---

## 7. Nepal Flag

### Decision

**`Flag_of_Nepal.svg` is the single source of truth. Do NOT embed as TypeScript string. Do NOT convert to PNG as permanent solution.**

### Current State

`OnboardingScreen.tsx` uses `<Image source={require('../../../assets/icons/Flag_of_Nepal.png')}/>` — a temporary PNG fallback.

### What Needs To Be Done

1. User installs `react-native-svg-transformer`: `npx expo install react-native-svg-transformer`
2. Create `mobile/metro.config.js`:
```javascript
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'svg');
config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg'];
module.exports = config;
```
3. Create `mobile/declarations.d.ts`:
```typescript
declare module '*.svg' {
  import React from 'react';
  import { SvgProps } from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}
```
4. Update `OnboardingScreen.tsx`:
```typescript
import NepalFlag from '../../../assets/icons/Flag_of_Nepal.svg';
// Usage: <NepalFlag width={180} height={220} />
```

---

## 8. Client Feedback Audit Table

| Feature | Status | Already Done | Needs Changes | Deferred | Notes |
|---------|--------|-------------|---------------|----------|-------|
| Splash Screen 1 (Logo + Heading) | ✅ | Yes | No | — | Commit dfac2eb |
| Splash Screen 2 (Nepal Flag) | 🟡 | Partially | SVG setup needed | — | Currently PNG |
| Splash Screen 3 (Features + CTA) | ✅ | Yes | No | — | |
| Welcome Subtitle | ✅ | Yes | No | — | "Discover . Create . Celebrate" |
| Welcome Description | ✅ | Yes | No | — | |
| Welcome Stats → Icons | ✅ | Yes | No | — | 🎨🖼️🤝 |
| Continue with Google | ✅ | Yes | No | — | Native GoogleSignin |
| Guest as text link | ✅ | Yes | No | — | |
| Home Pull to Refresh | ✅ | Yes | No | — | |
| Home Tab Refresh | ✅ | Yes | No | — | |
| Post Card Spacing | ✅ | Yes | No | — | 16→10px |
| Share URL | ✅ | Yes | No | — | artnepalaya.com/post/{id} |
| Explore Recent Searches | ✅ | Yes | No | — | |
| Explore Related Posts | ❌ | No | — | Next Phase | Significant backend work |
| Create "Creative Post" | ✅ | Yes | No | — | |
| Create Upload Media text | ✅ | Yes | No | — | |
| Create Caption | ✅ | Yes | No | — | |
| Create Tags | ✅ | Yes | No | — | |
| Create Post Category | ✅ | Yes | No | — | |
| Create Content Declaration | ✅ | Yes | No | — | |
| Community Post desc | ✅ | Yes | No | — | |
| Community Icons | ✅ | Yes | No | — | 🎨📚🤝 |
| Marketplace | ✅ | No changes | — | — | |
| Profile Photo | ✅ | Yes | No | — | Upload/change/remove |
| Profile Contact | ✅ | Yes | No | — | Website/WhatsApp/Phone |
| User Onboarding 3-step | ✅ | Yes | No | — | Role → About You → Interests |
| Push Notifications | ❌ | No | Critical fix | — | 0 tokens registered |
| Video Performance | 🟡 | Partially | Verify latest | — | Latest commit a70be90 |
| Feed Performance | 🟡 | Partially | Verify latest | — | React.memo + FlatList tuning |
| App Name "ArtNepalaya" | ✅ | Yes | No | — | app.json verified |

---

## 9. Performance Optimization Plan

| Priority | Item | Status | File |
|----------|------|--------|------|
| 1 | React.memo on PostCard | ✅ Done | PostCard.tsx |
| 2 | FlatList windowSize=5 | ✅ Done | HomeScreen.tsx |
| 3 | FlatList maxToRenderPerBatch=3 | ✅ Done | HomeScreen.tsx |
| 4 | getItemLayout | ✅ Done | HomeScreen.tsx |
| 5 | Lazy Video mount (thumbnail-first) | ✅ Done | PostCard.tsx |
| 6 | Cloudinary feed image transforms | ✅ Done | PostCard.tsx |
| 7 | Video unloadAsync on unmount | ✅ Done | PostCard.tsx, PostDetailScreen.tsx |
| 8 | Prevent repeated API calls | ✅ Done | HomeScreen.tsx, LoginScreen.tsx |
| 9 | removeClippedSubviews on FlatList | ❌ Not done | HomeScreen.tsx |
| 10 | Image caching (expo-image or fast-image) | ❌ Future | Would require new package |

---

## 10. Production Deployment

### Local Development

```bash
# Backend
cd backend
cp .env.development .env
docker-compose up -d    # MongoDB + Redis
npm run dev             # Express server at :8080

# Mobile
cd mobile
npm start               # Metro bundler
# Press 'a' for Android emulator

# Admin
cd admin
npm run dev             # Vite at :5173
```

### Production (Contabo VPS)

```bash
# SSH into server
ssh root@<contabo-ip>

# Pull latest
cd /root/artnepalaya-monorepo
git pull origin fix/final-stabilization

# Rebuild and restart
cd backend
docker-compose -f docker-compose.prod.yml up -d --build

# Verify
docker ps
docker logs artnepalaya-backend --tail 50
curl -k https://api.artnepalaya.com/api/v1/health
```

### EAS Build (Mobile APK)

```bash
cd mobile

# Preview APK (internal distribution)
eas build --platform android --profile preview

# Production
eas build --platform android --profile production
```

### Re-seed Admin Account

```bash
docker exec -it artnepalaya-backend node src/scripts/seed.js
```

---

## 11. QA Checklist

| Feature | Expected Behaviour | Verification | Pass Criteria |
|---------|-------------------|--------------|---------------|
| Google Login | Tap → account picker → auth → home | Tap "Continue with Google" | Reaches home feed |
| Guest Login | Tap → immediate entry | Tap "Continue as Guest" | Sees feed in guest mode |
| New User Onboarding | Signup → Role → About → Interests → Home | Create new Google account | 3-step wizard appears |
| Existing User Login | Login → direct to Home | Login with existing account | No onboarding shown |
| Push Registration | Login → token in MongoDB | Check `db.users.findOne({}, {pushTokens:1})` | Token array non-empty |
| Push Delivery | Admin broadcast → Android notification | Send from Admin Panel | OS notification appears |
| Post Like | Tap heart → count updates → notification sent | Like a post | Count increments, notification appears for owner |
| Post Save | Tap bookmark → saved | Save a post | Appears in saved tab |
| Media Upload | Select 3 images → publish → all visible | Upload multi-image post | Post Detail shows 3 images in carousel |
| Video Playback | Tap play → plays muted → tap pause → stops | Open video post | No autoplay, tap to control |
| Profile Edit | Change bio → save → reflected | Edit and save | Updated on profile screen |
| Avatar Upload | Pick image → upload → reflected | Change profile picture | New avatar everywhere |
| Admin Search | Type username → results filter | Search "admin" | Correct user appears |
| Featured Posts | Admin features post → appears in Featured | Feature a post | Visible on mobile Featured section |
| CMS Pages | Admin edits → mobile shows | Edit Terms page | Updated in mobile settings |
| Share | Tap share → URL shared | Share a post | URL format: artnepalaya.com/post/{id} |
| 18+ Content | Non-opted user taps NSFW → restriction screen | Tap 18+ post as restricted user | Shows restriction + back button |

---

## 12. Development Rules

1. **Runtime behaviour always overrides static code analysis.** If the APK behaves differently from what code suggests, trust the runtime.
2. **Do not mark features as complete without runtime verification.** Especially push notifications.
3. **Official `Flag_of_Nepal.svg` is the single source of truth.** Do NOT embed as TypeScript string or convert to PNG permanently.
4. **No unnecessary architectural rewrites during MVP stabilization.** Stability > features.
5. **Keep the MVP simple, stable, and production-ready.**
6. **Prioritize correctness, performance, and maintainability over adding new features.**
7. **When a client request is already implemented correctly, verify it rather than rewriting it.**
8. **Push notifications are NOT fixed until a physical device receives an OS notification.**
9. **Every feature must have runtime evidence before being marked complete.**
10. **Do not hardcode configuration values** — use AppConfig or constants modules for tunable parameters.
11. **Preserve existing architecture** — avoid introducing new abstractions unless required.
12. **Commit one logical fix per commit** — keeps changes reviewable and isolatable.

---

## 13. START HERE

### When beginning the next chat, work on these items in this exact order:

---

**STEP 1: Verify the APK matches HEAD**

Before debugging anything, confirm the latest EAS build used commit `a70be90` or later. If not, the user needs to rebuild.

---

**STEP 2: Push Notifications (Critical Blocker)**

The user must provide Logcat output showing `[PushReg] Stage 1-8`. Without this, no code change can fix it. The implementation is believed correct — the unknown is whether `getExpoPushTokenAsync()` succeeds on the physical device.

If Logcat shows Stage 6 failing → it's a Google Services / FCM config issue in the EAS build.
If Logcat shows Stage 7 failing → it's a network/auth issue reaching the backend.
If no `[PushReg]` logs appear at all → `registerForPushNotifications()` was never called (investigate LoginScreen flow).

---

**STEP 3: Video Performance Verification**

After rebuilding from HEAD (`a70be90`), verify:
- Videos show thumbnail only (no autoplay)
- Tap to play works
- Feed scrolls smoothly

If still laggy after this commit, the issue is deeper (expo-av overhead, image sizes, SDK alpha bugs).

---

**STEP 4: Nepal Flag SVG Setup**

User needs to locally:
1. `npx expo install react-native-svg-transformer`
2. Create `metro.config.js`
3. Create `declarations.d.ts`
4. Import `Flag_of_Nepal.svg` directly in OnboardingScreen

---

**STEP 5: Continue with remaining QA items from audit table**

Most items are ✅ already. Focus only on items marked 🟡 or ❌.

---

**IMPORTANT: Do not guess at runtime issues. Always ask for Logcat evidence before proposing code changes.**
