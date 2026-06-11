// src/utils/urls.ts
// Share URL helper functions for generating deep-linkable URLs

const APP_URL = process.env.EXPO_PUBLIC_APP_URL || 'https://artnepalaya.com';

/**
 * Build a shareable URL for a specific post.
 */
export function buildPostUrl(postId: string): string {
  return `${APP_URL}/post/${postId}`;
}

/**
 * Build a shareable URL for an artist profile.
 */
export function buildArtistUrl(username: string): string {
  return `${APP_URL}/artist/${username}`;
}

/**
 * Build a shareable URL for a user's gallery.
 */
export function buildGalleryUrl(username: string): string {
  return `${APP_URL}/gallery/${username}`;
}

/**
 * Build a shareable URL for a business profile.
 */
export function buildBusinessUrl(username: string): string {
  return `${APP_URL}/business/${username}`;
}
