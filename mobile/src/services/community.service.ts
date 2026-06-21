import { api } from './api';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const communityService = {
  joinWaitlist: async () => {
    const response = await api.post('/community/waitlist');
    return response.data;
  },

  registerInterest: async (type: 'community' | 'marketplace') => {
    let deviceId = await SecureStore.getItemAsync('deviceId');
    if (!deviceId) {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 10);
      deviceId = `${Platform.OS}-${timestamp}-${random}`;
      await SecureStore.setItemAsync('deviceId', deviceId);
    }
    const response = await api.post('/community/interest', { type, deviceId });
    return response.data;
  },
};
