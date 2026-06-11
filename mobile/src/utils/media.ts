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
