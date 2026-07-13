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
 * Handles URLs that may already have transformations applied.
 */
export function getOptimizedImageUrl(url: string | undefined, width: number = 600, quality: number = 80): string | undefined {
  if (!url) return undefined;
  if (!url.includes('res.cloudinary.com')) return url;

  const uploadIndex = url.indexOf('/upload/');
  if (uploadIndex === -1) return url;

  const before = url.substring(0, uploadIndex + '/upload/'.length);
  const after = url.substring(uploadIndex + '/upload/'.length);

  // Detect if the segment after /upload/ is a transformation chain.
  // Cloudinary transformations contain patterns like f_, q_, w_, h_, c_, etc.
  // Version identifiers start with 'v' followed by digits.
  // File paths start with folder names or directly with the public ID.
  let imagePath = after;

  // If after starts with transformations (contains commas or known prefixes before a /vNNNN/ or file path)
  // strip them by finding the version segment or the last path component
  const versionMatch = after.match(/(?:^|\/)(v\d+\/.+)$/);
  if (versionMatch) {
    imagePath = versionMatch[1];
  } else {
    // Check if the first segment looks like a transformation (contains _ which is the key=value separator)
    const firstSlash = after.indexOf('/');
    if (firstSlash > 0) {
      const firstSegment = after.substring(0, firstSlash);
      // Transformation segments contain underscores (e.g., f_auto, w_600, c_fill)
      if (firstSegment.includes('_') && /^[a-z]/.test(firstSegment)) {
        // This looks like a transformation chain, skip to the path after it
        // Find the path portion (either starts with v+digits or a folder name without _)
        const remaining = after.substring(firstSlash + 1);
        const vMatch = remaining.match(/^(v\d+\/.+)$/);
        if (vMatch) {
          imagePath = vMatch[1];
        } else {
          // Take remaining as the path
          imagePath = remaining;
        }
      }
    }
  }

  return `${before}f_auto,q_${quality},w_${width}/${imagePath}`;
}

/**
 * Returns a smaller thumbnail version for grid/list displays.
 */
export function getThumbnailUrl(url: string | undefined, width: number = 300): string | undefined {
  return getOptimizedImageUrl(url, width, 60);
}
