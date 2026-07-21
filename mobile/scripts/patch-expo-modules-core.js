/**
 * Patch expo-modules-core PermissionsService.kt for Android SDK 35 compatibility.
 *
 * Problem: expo-modules-core 1.11.14 has an unsafe call on a nullable receiver at line 166
 * of PermissionsService.kt. With compileSdk 35, Android's PackageInfo.requestedPermissions
 * is annotated as @Nullable, causing the Kotlin compiler to reject the unsafe call.
 *
 * Fix: Replace `requestedPermissions.contains(permission)` with
 *      `requestedPermissions?.contains(permission) ?: false`
 *
 * This script runs as a postinstall hook and is idempotent (safe to run multiple times).
 * It will be unnecessary once expo-modules-core is updated to a version that includes this fix.
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-modules-core',
  'android',
  'src',
  'main',
  'java',
  'expo',
  'modules',
  'adapters',
  'react',
  'permissions',
  'PermissionsService.kt'
);

try {
  if (!fs.existsSync(filePath)) {
    console.log('[patch] PermissionsService.kt not found (node_modules may not be installed yet). Skipping.');
    process.exit(0);
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Check if already patched
  if (content.includes('requestedPermissions?.contains(permission) ?: false')) {
    console.log('[patch] expo-modules-core PermissionsService.kt already patched. Skipping.');
    process.exit(0);
  }

  // Apply the fix: make the nullable call safe
  const oldCode = 'requestedPermissions.contains(permission)';
  const newCode = 'requestedPermissions?.contains(permission) ?: false';

  if (!content.includes(oldCode)) {
    console.log('[patch] Target code not found in PermissionsService.kt. The file may have a different version.');
    process.exit(0);
  }

  content = content.replace(oldCode, newCode);
  fs.writeFileSync(filePath, content, 'utf8');

  console.log('[patch] Successfully patched expo-modules-core PermissionsService.kt for Android SDK 35 compatibility.');
} catch (error) {
  console.error('[patch] Failed to patch PermissionsService.kt:', error.message);
  // Don't fail the install — the build will fail later with a clear error if unpatched
  process.exit(0);
}
