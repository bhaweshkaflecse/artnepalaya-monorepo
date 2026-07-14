/**
 * Media Utility Functions - Cloudinary URL Optimization
 *
 * Recommended usage pattern:
 * - Feed/grid images: use getOptimizedImageUrl (adds w_750, q_auto, f_auto)
 * - Video thumbnails: use getVideoThumbnailUrl (extracts still frame as jpg)
 * - Video playback: use getOptimizedVideoUrl (adds q_auto, f_auto)
 * - OG/share images: use raw URL (no optimization - crawlers need the original)
 * - Avatars: use raw URL (already small, no optimization needed)
 *
 * All transform functions include a hasExistingTransforms guard to prevent
 * double-stacking Cloudinary transforms on URLs that are already optimized.
 */
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
 * Transforms a Cloudinary video URL into a thumbnail image URL.
 * Changes the file extension to .jpg and adds transformation parameters
 * for a still frame at 0 seconds, width 400, with fill crop.
 *
 * Example:
 *   Input:  https://res.cloudinary.com/demo/video/upload/v123/sample.mp4
 *   Output: https://res.cloudinary.com/demo/video/upload/so_0,w_400,c_fill/v123/sample.jpg
 */
export function getVideoThumbnailUrl(videoUrl: string): string {
  if (!videoUrl) return '';

  // Replace the extension with .jpg
  const withoutExt = videoUrl.replace(/\.[^/.]+$/, '.jpg');

  // Insert transformation before the version/path segment
  // Cloudinary URLs follow pattern: .../upload/[transformations/]v{version}/...
  const uploadSegment = '/upload/';
  const uploadIdx = withoutExt.indexOf(uploadSegment);
  if (uploadIdx === -1) {
    // Not a standard Cloudinary URL, just return with .jpg extension
    return withoutExt;
  }

  const beforeUpload = withoutExt.substring(0, uploadIdx + uploadSegment.length);
  const afterUpload = withoutExt.substring(uploadIdx + uploadSegment.length);

  return `${beforeUpload}so_0,w_400,c_fill/${afterUpload}`;
}

/**
 * Transforms a Cloudinary video URL to add quality and format optimizations.
 * Adds q_auto (automatic quality) and f_auto (automatic format selection)
 * transformations for better delivery performance.
 *
 * If the URL already contains transformations (detected by the segment after
 * /upload/ matching a transform pattern like c_fill,w_400), returns it unchanged
 * to avoid double-stacking transforms which produces invalid URLs.
 *
 * Example:
 *   Input:  https://res.cloudinary.com/demo/video/upload/v123/sample.mp4
 *   Output: https://res.cloudinary.com/demo/video/upload/q_auto,f_auto/v123/sample.mp4
 *
 * If the URL is not a standard Cloudinary URL, returns it unchanged.
 */
export function getOptimizedVideoUrl(videoUrl: string): string {
  if (!videoUrl) return '';

  const uploadSegment = '/upload/';
  const uploadIdx = videoUrl.indexOf(uploadSegment);
  if (uploadIdx === -1) {
    // Not a standard Cloudinary URL, return unchanged
    return videoUrl;
  }

  const afterUpload = videoUrl.substring(uploadIdx + uploadSegment.length);

  // Detect if transforms already exist after /upload/.
  // Cloudinary transforms look like: c_fill,w_400/... or w_750,q_auto/...
  // Version segments look like: v1234567890/...
  // If the first path segment matches a transform pattern, skip optimization.
  if (hasExistingTransforms(afterUpload)) {
    return videoUrl;
  }

  const beforeUpload = videoUrl.substring(0, uploadIdx + uploadSegment.length);

  return `${beforeUpload}q_auto,f_auto/${afterUpload}`;
}

/**
 * Transforms a Cloudinary image URL to add width, quality, and format optimizations.
 * Inserts w_750,q_auto,f_auto transformations for optimized feed delivery.
 * Keeps the original file extension.
 *
 * If the URL already contains transformations (detected by the segment after
 * /upload/ matching a transform pattern like c_fill,w_400), returns it unchanged
 * to avoid double-stacking transforms which produces invalid URLs.
 *
 * Example:
 *   Input:  https://res.cloudinary.com/demo/image/upload/v123/sample.jpg
 *   Output: https://res.cloudinary.com/demo/image/upload/w_750,q_auto,f_auto/v123/sample.jpg
 *
 * If the URL is not a standard Cloudinary URL, returns it unchanged.
 */
export function getOptimizedImageUrl(imageUrl: string): string {
  if (!imageUrl) return '';

  const uploadSegment = '/upload/';
  const uploadIdx = imageUrl.indexOf(uploadSegment);
  if (uploadIdx === -1) {
    // Not a standard Cloudinary URL, return unchanged
    return imageUrl;
  }

  const afterUpload = imageUrl.substring(uploadIdx + uploadSegment.length);

  // Detect if transforms already exist after /upload/.
  // Cloudinary transforms look like: c_fill,w_400/... or w_750,q_auto/...
  // Version segments look like: v1234567890/...
  // If the first path segment matches a transform pattern, skip optimization.
  if (hasExistingTransforms(afterUpload)) {
    return imageUrl;
  }

  const beforeUpload = imageUrl.substring(0, uploadIdx + uploadSegment.length);

  return `${beforeUpload}w_750,q_auto,f_auto/${afterUpload}`;
}

/**
 * Detects whether a Cloudinary URL path (the part after /upload/) already
 * contains transformation parameters.
 *
 * Cloudinary transforms are key_value pairs like c_fill, w_400, q_auto, f_auto.
 * They follow the pattern: one or more lowercase letters, underscore, then value.
 * Version strings (v followed by digits) are NOT transforms.
 *
 * Examples of paths WITH transforms:
 *   "c_fill,w_400/v123/file.jpg"  -> true
 *   "w_750,q_auto,f_auto/v123/file.jpg" -> true
 *
 * Examples of paths WITHOUT transforms:
 *   "v123/file.jpg" -> false
 *   "artnepalaya/posts/file.jpg" -> false
 */
function hasExistingTransforms(afterUpload: string): boolean {
  // Get the first path segment (before the first /)
  const firstSlash = afterUpload.indexOf('/');
  const firstSegment = firstSlash === -1 ? afterUpload : afterUpload.substring(0, firstSlash);

  // Skip version-only segments (v followed by digits)
  if (/^v\d+$/.test(firstSegment)) {
    return false;
  }

  // Cloudinary transform pattern: starts with a letter sequence followed by underscore
  // e.g., c_fill, w_400, q_auto, f_auto, so_0, etc.
  // A segment is a transform if it matches: letter(s)_value (possibly comma-separated)
  return /^[a-z][a-z0-9]*_[^/]+$/.test(firstSegment);
}
