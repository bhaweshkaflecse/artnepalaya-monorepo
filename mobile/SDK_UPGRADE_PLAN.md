# SDK Upgrade Plan — Art Nepalaya Mobile

**Created:** July 2025  
**Current State:** Expo SDK 50.0.0-alpha.3, React Native 0.73.6, Android API 35  
**Priority:** Post-launch (after v1.0.0 Play Store release)

---

## Current Versions

| Component | Version | Notes |
|-----------|---------|-------|
| Expo SDK | ~50.0.0-alpha.3 | Alpha — known stability risks |
| React Native | 0.73.6 | Stable for this RN version |
| Android compileSdk | 35 | Updated for Play Store compliance |
| Android targetSdk | 35 | Updated for Play Store compliance |
| Android minSdk | 23 | Covers ~99% of Android devices |
| Android Build Tools | 35.0.0 | Matches compileSdk |
| Gradle Plugin | (via Expo) | Managed by react-native-gradle-plugin |
| Kotlin | 1.8.10 | Set in build.gradle |
| Java | 17 | EAS default for SDK 50 |
| Node.js | 22 | Production runtime |

---

## Why API 35 Works Without Full SDK Upgrade

Android API 35 (Android 15) primarily adds:
- Predictive back gesture enforcement
- Edge-to-edge display enforcement
- New permission behaviors for photos/videos

For our app:
- We already use `READ_MEDIA_IMAGES` and `READ_MEDIA_VIDEO` (Android 13+ permissions)
- We already have `POST_NOTIFICATIONS` (Android 13+ permission)
- We use React Navigation (handles back gestures via the native stack)
- Edge-to-edge is handled by SafeAreaProvider

**No behavioral changes are expected from simply bumping targetSdk to 35.**

---

## Recommended Future Upgrade Path

### Phase 1: Expo SDK Stable (Recommended first)

| From | To | Risk | Effort |
|------|----|------|--------|
| Expo SDK 50.0.0-alpha.3 | Expo SDK 52 (latest stable) | Medium | 2-3 days |

**Breaking changes to evaluate:**
- expo-notifications API changes
- expo-av deprecated in favor of expo-video
- React Native 0.76+ (New Architecture default)
- Gradle 8.x requirement
- Kotlin 1.9+ requirement

### Phase 2: React Native (Bundled with Expo)

| From | To | Risk | Effort |
|------|----|------|--------|
| React Native 0.73.6 | 0.76.x (via Expo 52) | Medium-High | Included in Expo upgrade |

**Key changes:**
- New Architecture (Fabric + TurboModules) enabled by default
- Some third-party libraries may need updates
- Android Gradle Plugin 8.x required

### Phase 3: Android API 36 Readiness

Google Play will likely require API 36 by late 2025 / early 2026.

| Requirement | Current | Target |
|-------------|---------|--------|
| targetSdkVersion | 35 | 36 |
| compileSdkVersion | 35 | 36 |
| buildToolsVersion | 35.0.0 | 36.0.0 |

This should be a trivial change (same as this API 35 bump) unless Android 16 introduces breaking behaviors.

---

## Estimated Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| expo-notifications breaking changes | Medium | High | Test push pipeline thoroughly |
| Third-party lib incompatibility | Medium | Medium | Check @react-native-google-signin compatibility matrix |
| Build system changes (Gradle/AGP) | Low | Medium | Follow Expo upgrade guide exactly |
| New Architecture migration | Medium | High | Can be deferred with `newArchEnabled=false` |
| expo-av → expo-video migration | High | Medium | Video playback logic needs rewrite |

---

## Upgrade Checklist (When Ready)

1. [ ] Create a separate branch: `upgrade/expo-sdk-52`
2. [ ] Run `npx expo install --check` to identify version mismatches
3. [ ] Update `package.json` Expo packages to compatible versions
4. [ ] Run `npx expo prebuild --clean` to regenerate native projects
5. [ ] Resolve any build errors in `android/` and `ios/`
6. [ ] Test ALL features end-to-end on real device
7. [ ] Verify push notifications, Google Sign-In, video playback
8. [ ] Update documentation
9. [ ] Merge only after full runtime verification

---

## Decision: DO NOT UPGRADE FOR v1.0.0

The current alpha SDK works correctly for our use case. The API 35 bump is sufficient for Play Store compliance. A full Expo SDK upgrade carries significant risk of regressions and should only be done:

- After v1.0.0 is successfully launched
- After user feedback stabilizes
- With dedicated testing time (2-3 days minimum)
- On a separate branch with full regression testing

The alpha SDK designation is a naming concern, not a stability concern for our specific feature set.
