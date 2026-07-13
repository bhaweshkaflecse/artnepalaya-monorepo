import { api } from './api';
import { safeGetOrCreateDeviceId } from '../utils/secureStore';

export const communityService = {
  joinWaitlist: async () => {
    const response = await api.post('/community/waitlist');
    return response.data;
  },

  registerInterest: async (type: 'community' | 'marketplace') => {
    const deviceId = await safeGetOrCreateDeviceId();
    const response = await api.post('/community/interest', { type, deviceId });
    return response.data;
  },
};
