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
