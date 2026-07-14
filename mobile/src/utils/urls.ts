// src/utils/urls.ts
// Centralized Share URL Service for generating deep-linkable URLs

const SHARE_BASE_URL =
  process.env.EXPO_PUBLIC_SHARE_BASE_URL || 'https://api.artnepalaya.com';

/**
 * Centralized ShareService for generating all shareable URLs.
 * Uses the API domain with short path prefixes for clean, readable links.
 */
export const ShareService = {
  /**
   * Generate a shareable URL for a specific post/artwork.
   * Format: /p/<postId>
   */
  generatePostUrl(postId: string): string {
    return `${SHARE_BASE_URL}/p/${postId}`;
  },

  /**
   * Generate a shareable URL for a user profile.
   * Format: /u/<username>
   */
  generateProfileUrl(username: string): string {
    return `${SHARE_BASE_URL}/u/${username}`;
  },

  /**
   * Generate a shareable URL for a community.
   * Format: /c/<communityId>
   */
  generateCommunityUrl(communityId: string): string {
    return `${SHARE_BASE_URL}/c/${communityId}`;
  },

  /**
   * Generate a shareable URL for an event.
   * Format: /e/<eventId>
   */
  generateEventUrl(eventId: string): string {
    return `${SHARE_BASE_URL}/e/${eventId}`;
  },

  /**
   * Generate a shareable URL for a marketplace item.
   * Format: /m/<itemId>
   */
  generateMarketplaceUrl(itemId: string): string {
    return `${SHARE_BASE_URL}/m/${itemId}`;
  },
};

// Backward-compatible exports (legacy API)
export function buildPostUrl(postId: string): string {
  return ShareService.generatePostUrl(postId);
}

export function buildArtistUrl(username: string): string {
  return ShareService.generateProfileUrl(username);
}

export function buildGalleryUrl(username: string): string {
  return `${SHARE_BASE_URL}/u/${username}`;
}

export function buildBusinessUrl(username: string): string {
  return `${SHARE_BASE_URL}/u/${username}`;
}
