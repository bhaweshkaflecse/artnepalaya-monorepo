// src/services/config.service.ts
import { api } from './api';

export interface AuthMediaItem {
  url: string;
  type: 'image' | 'video';
}

export const configService = {
  fetchAuthBackgroundMedia: async (): Promise<AuthMediaItem[]> => {
    const response = await api.get('/config/auth-media');
    return response.data.data || [];
  },
};
