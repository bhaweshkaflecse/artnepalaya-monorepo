// src/utils/secureStore.ts
// Safe wrapper around expo-secure-store to handle decryption failures gracefully.
// If a value cannot be decrypted (e.g., after app reinstall or keychain corruption),
// the corrupted key is deleted and null is returned instead of throwing.

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Safely reads a value from SecureStore.
 * If decryption fails (e.g., "Could not decrypt value"), the corrupted key
 * is automatically deleted and null is returned. Never throws.
 */
export async function safeGetItemAsync(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error: any) {
    console.warn(
      `[SecureStore] Failed to read key "${key}", deleting corrupted entry:`,
      error?.message || error
    );
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (deleteError) {
      // Ignore delete errors - the key may not exist or store may be unavailable
      console.warn(`[SecureStore] Failed to delete key "${key}":`, deleteError);
    }
    return null;
  }
}

/**
 * Safely writes a value to SecureStore.
 * If the Android keystore or iOS keychain is unavailable or corrupted,
 * the write fails silently and returns false. Never throws.
 */
export async function safeSetItemAsync(key: string, value: string): Promise<boolean> {
  try {
    await SecureStore.setItemAsync(key, value);
    return true;
  } catch (error: any) {
    console.warn(`[SecureStore] Failed to write key "${key}":`, error?.message || error);
    return false;
  }
}

/**
 * Safely deletes a value from SecureStore.
 * If the store is unavailable, the delete fails silently and returns false. Never throws.
 */
export async function safeDeleteItemAsync(key: string): Promise<boolean> {
  try {
    await SecureStore.deleteItemAsync(key);
    return true;
  } catch (error: any) {
    console.warn(`[SecureStore] Failed to delete key "${key}":`, error?.message || error);
    return false;
  }
}

/**
 * Safely reads the deviceId from SecureStore.
 * If the stored value is corrupted or missing, generates a new deviceId,
 * persists it, and returns it. Never throws.
 */
export async function safeGetOrCreateDeviceId(): Promise<string> {
  const existing = await safeGetItemAsync('deviceId');
  if (existing) {
    return existing;
  }

  // Generate a new device identifier
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  const newDeviceId = `${Platform.OS}-${timestamp}-${random}`;

  await safeSetItemAsync('deviceId', newDeviceId);

  return newDeviceId;
}
