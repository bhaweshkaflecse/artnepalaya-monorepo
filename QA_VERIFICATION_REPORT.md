# QA Verification Report — Art Nepalaya

**Last Updated:** July 2025  
**Branch:** `fix/final-stabilization`  
**Build:** Latest commit on branch

---

## Verification States

| State | Meaning |
|-------|---------|
| ✅ Runtime Verified | Confirmed working on real device with evidence |
| 🟡 Code Complete | Implemented and code-reviewed, awaiting runtime test |
| ❌ Known Issue | Bug identified, fix pending or under investigation |

---

## Core Features

| Feature | Status | Evidence |
|---------|--------|----------|
| Google Sign-In | ✅ Runtime Verified | Works on Preview APK, tokens verified |
| Guest Mode | ✅ Runtime Verified | Browse feed, 15-post limit enforced |
| User Onboarding (4 steps) | ✅ Runtime Verified | Role, About You, Interests, Mature Content |
| Post Creation | ✅ Runtime Verified | Multi-media upload + artwork type persisted |
| Artwork Type Persistence | ✅ Runtime Verified | PRE-ZOD/POST-ZOD logs confirm array stored in MongoDB |
| Home Feed | ✅ Runtime Verified | Posts appear, pull-to-refresh works |
| Explore (All) | ✅ Runtime Verified | Shows all posts |
| Explore (Category Filters) | ✅ Runtime Verified | Newly created posts appear under correct category |
| Profile | ✅ Runtime Verified | Posts grid, metrics, follow button |
| Follow System | ✅ Runtime Verified | Follow/unfollow updates counts |
| Like / Save | ✅ Runtime Verified | Optimistic UI with rollback |
| Share Pages | ✅ Runtime Verified | Landing page renders, OG tags present |
| Deep Linking (Custom Scheme) | ✅ Runtime Verified | `artnepalaya://` opens correct screen |
| Admin Panel | ✅ Runtime Verified | All pages accessible and functional |
| Admin Broadcast | ✅ Runtime Verified | Notifications created, tokens targeted |
| Recommendation Engine Admin | ✅ Runtime Verified | Simulation, score breakdown, timeline |
| SecureStore Safe Wrappers | ✅ Runtime Verified | No more decryption crashes |
| Video Playback | ✅ Runtime Verified | Play on tap, progress bar, audio |
| Video → Post Detail navigation | ✅ Runtime Verified | Single tap navigates correctly |
| Content Moderation (NSFW) | ✅ Runtime Verified | Filtered based on user preference |

---

## Under Investigation

| Feature | Status | Notes |
|---------|--------|-------|
| Push Notification (Device Delivery) | 🟡 Code Complete | Backend sends successfully (2 tokens, 0 failures). Device not receiving. Notification channel now created at module load. Token re-registered on app resume. |
| Android App Links (Auto-Verify) | 🟡 Code Complete | Intent filters configured. `assetlinks.json` needs real SHA-256 fingerprint to verify. |
| Feed Path for Users Without Interests | 🟡 Code Complete | Currently uses legacy fallback. Diagnostic logging added to verify which path executes. |

---

## Resolved Issues (This Stabilization Cycle)

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| artworkType saved as `[]` | `createPostSchema` didn't define artworkType field → Zod stripped it | Added artworkType with z.preprocess to createPostSchema |
| SecureStore crash on login | `getItemAsync('deviceId')` threw on decryption failure | Created safe wrappers that never throw |
| Explore filters return empty | artworkType not stored → no matches | Fixed by artworkType persistence fix above |
| Home tab crash | `navigation.emit('homeTabRefresh')` → custom event TypeError | Removed custom event emission |
| Home feed not showing new posts | Redis 300s cache + recommendation fallback | First page always queries fresh (bypass cache) |
| Share page CSP blocks images | Helmet default CSP too strict | Disabled Helmet CSP, applied per-route |
| Old Cloudinary images broken | `getOptimizedImageUrl` double-stacked transforms | Added `hasExistingTransforms()` detection |
| Google Sign-In error on release | Missing `google-services` Gradle plugin | Added classpath + apply plugin |
| Video muted after autoplay removal | `isMuted={true}` hardcoded | Changed to `isMuted={false}` |
| Duplicate login buttons | Both "Sign In" and "Sign Up" with Google | Kept only "Continue with Google" |
| CORS blocking PATCH | `methods` array missing PATCH | Added PATCH |
| Push token not re-registered | Only registered during login | Added AppState listener for re-registration |
| Share page duplicate CTA | Sticky + main visible simultaneously | Removed sticky entirely, one CTA |
| Subrole selection unlimited | Frontend allowed > 5 selections | Added MAX_SUBROLES = 5 limit |
| Artwork type selection unlimited | Frontend allowed > 5 | Added MAX_ARTWORK_TYPES = 5 limit |
| Username shows as "User" | `fullName` not imported from Google | Added `fullName: payload.name` to User.create |
| Feed dominated by old posts | Raw engagement scores (not normalized) | Applied log₂ normalization to all engagement signals |

---

## Performance Observations

| Metric | Observation |
|--------|-------------|
| Feed load time | Acceptable (<2s on good connection) |
| Image loading | Cloudinary with format/quality auto |
| Video playback | Smooth with proper buffering |
| Navigation | No jank observed |
| Memory | No OOM observed during testing |

---

## Recommendation Engine Status

| Component | Status |
|-----------|--------|
| Signal Registry (13 signals) | ✅ Implemented |
| Log₂ Normalization | ✅ Implemented |
| Diversity Filter | ✅ Implemented |
| Fresh Content Injection (30%) | ✅ Implemented |
| Exploration Slots (10%) | ✅ Implemented |
| Admin Simulation | ✅ Working |
| Score Breakdown | ✅ Working |
| Pipeline Timeline | ✅ Working |
| Excluded Posts Inspection | ✅ Working |
| Configurable Weights (AppConfig) | ✅ Working |
| Production Integration | 🟡 Under verification (legacy fallback for some users) |

---

## Test Environments

| Environment | Details |
|-------------|---------|
| Physical Device | Android (real hardware) |
| Build Type | EAS Preview APK |
| Backend | Docker on Ncell Cloud |
| Database | Production MongoDB |
| Accounts Tested | 2 Gmail + Guest + Admin |
