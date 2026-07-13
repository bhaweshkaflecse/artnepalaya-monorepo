import { PostMedia } from '../services/post.service';

/**
 * Returns the first image media item from a post's media array.
 * Falls back to the first media item if no image is found.
 */
export function getPrimaryImage(media: PostMedia[]): PostMedia | undefined {
  if (!media || media.length === 0) return undefined;
  return media.find((m) => m.type === 'image') || media[0];
}

/**
 * Returns the first video media item from a post's media array.
 * Returns undefined if no video is present.
 */
export function getPrimaryVideo(media: PostMedia[]): PostMedia | undefined {
  if (!media || media.length === 0) return undefined;
  return media.find((m) => m.type === 'video');
}

/**
 * Returns the URL of the primary image for display purposes.
 * Returns undefined if no suitable media is found.
 */
export function getPrimaryImageUrl(media: PostMedia[]): string | undefined {
  const primary = getPrimaryImage(media);
  return primary?.url;
}

/**
 * Transforms a Cloudinary URL to serve an optimized image.
 * Adds auto-format, auto-quality, and width constraints.
 * Only transforms URLs from res.cloudinary.com; returns others unchanged.
 */
export function getOptimizedImageUrl(url: string | undefined, width: number = 600, quality: number = 80): string | undefined {
  if (!url) return undefined;
  if (!url.includes('res.cloudinary.com')) return url;
  // Insert transformation before /upload/ or after /upload/
  // Cloudinary URL pattern: https://res.cloudinary.com/<cloud>/image/upload/<transformations>/<path>
  const uploadIndex = url.indexOf('/upload/');
  if (uploadIndex === -1) return url;
  const before = url.substring(0, uploadIndex + '/upload/'.length);
  const after = url.substring(uploadIndex + '/upload/'.length);
  // Remove any existing transformations that start with known patterns
  const cleanAfter = after.replace(/^(f_auto|q_auto|q_\d+|w_\d+|c_\w+)[,/]*/g, '');
  return `${before}f_auto,q_${quality},w_${width}/${cleanAfter || after}`;
}

/**
 * Returns a smaller thumbnail version for grid/list displays.
 */
export function getThumbnailUrl(url: string | undefined, width: number = 300): string | undefined {
  return getOptimizedImageUrl(url, width, 60);
}
