# EAS Build Setup Guide

This guide walks you through setting up Expo Application Services (EAS) for building the ArtNepalaya mobile app.

## Prerequisites

- Node.js 18+ installed
- An Expo account linked to the organization owner **"erbhaweshkafle"**
- Access to the [Expo Dashboard](https://expo.dev)

## Step 1: Install EAS CLI

```bash
npm install -g eas-cli
```

## Step 2: Login to Expo

```bash
eas login
```

Use the account that owns the **"erbhaweshkafle"** organization/user. Verify you are logged in:

```bash
eas whoami
```

## Step 3: Initialize the EAS Project

From the repository root, navigate to the mobile directory and initialize:

```bash
cd mobile
eas init --id <your-project-id>
```

Alternatively, you can run `eas build:configure` which will auto-generate the `projectId` and update `app.json` for you:

```bash
cd mobile
eas build:configure
```

## Step 4: Verify the Project ID

After running `eas init` or `eas build:configure`, the `projectId` in `app.json` at `extra.eas.projectId` will be updated automatically.

If it was not updated, copy the UUID from the EAS dashboard:
1. Go to https://expo.dev
2. Select the **artnepalaya-mobile** project
3. Navigate to **Project Settings**
4. Copy the **Project ID** (a UUID like `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
5. Replace the placeholder in `app.json`:

```json
"extra": {
  "eas": {
    "projectId": "<paste-your-real-project-id-here>"
  }
}
```

## Step 5: Build Preview APK (for testing)

Build a preview APK that can be installed directly on an Android device:

```bash
eas build --profile preview --platform android
```

This produces a `.apk` file suitable for internal testing and QA. The build runs on EAS servers and the result is available for download from the Expo dashboard.

## Step 6: Build Production AAB (for Play Store)

Build a production Android App Bundle for Google Play Store submission:

```bash
eas build --profile production --platform android
```

This produces a `.aab` file optimized for the Play Store.

## Important Notes

### Expo SDK Version

This project uses **Expo SDK ~50.0.0-alpha.3** which is an alpha release. Monitor for stability issues during builds and at runtime. If you encounter unexpected crashes or build failures, check the [Expo changelog](https://expo.dev/changelog) for known issues with this SDK version.

### Push Notifications

Push notifications require testing on a **real physical device** after building. The Expo push notification service will not work in the Expo Go app for production builds. After building a preview or production APK/AAB:

1. Install the app on a physical Android device
2. Grant notification permissions when prompted
3. Verify the push token is registered with the backend
4. Send a test notification from the admin panel to confirm delivery

### EAS Build Profiles

The build profiles are defined in `eas.json`:
- **preview**: Produces a directly installable `.apk` for testing
- **production**: Produces a `.aab` signed for Play Store distribution
