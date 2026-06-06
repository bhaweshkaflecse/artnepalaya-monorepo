import { api } from './api';

export const communityService = {
  joinWaitlist: async () => {
    const response = await api.post('/community/waitlist');
    return response.data;
  },
};
