// src/services/config.service.ts
import { api } from './api';

export interface AuthMediaItem {
  url: string;
  type: 'image' | 'video';
}

/**
 * Append a cache-busting query parameter to a URL.
 * Handles URLs that already contain query parameters.
 */
function appendCacheBuster(url: string, timestamp: number): string {
  if (!url) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_cb=${timestamp}`;
}

export const configService = {
  fetchAuthBackgroundMedia: async (): Promise<AuthMediaItem[]> => {
    const cacheBuster = Date.now();
    const response = await api.get('/config/auth-media', {
      params: { _t: cacheBuster },
    });
    const items: AuthMediaItem[] = response.data.data || [];

    // Append cache-busting param to each media URL so React Native Image
    // treats updated Cloudinary URLs as new resources
    return items.map((item) => ({
      ...item,
      url: appendCacheBuster(item.url, cacheBuster),
    }));
  },
};
