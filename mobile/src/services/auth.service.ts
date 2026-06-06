// src/services/auth.service.ts
import { api } from './api';

interface AuthResponse {
  data: {
    user: {
      id: string;
      email: string;
      username: string;
      role: string;
      phoneNumber?: string;
      avatarUrl?: string;
      fullName?: string;
    };
    accessToken: string;
    refreshToken: string;
  };
}

interface OtpResponse {
  data: {
    message: string;
  };
}

export const authService = {
  googleLogin: async (idToken: string, deviceId: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/google', { idToken, deviceId });
    return response.data;
  },

  sendOtp: async (phoneNumber: string, token: string): Promise<OtpResponse> => {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const response = await api.post(
      '/auth/otp/send',
      { phoneNumber },
      { headers }
    );
    return response.data;
  },

  verifyOtp: async (
    phoneNumber: string,
    otp: string,
    deviceId: string,
    token: string
  ): Promise<AuthResponse> => {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const response = await api.post(
      '/auth/otp/verify',
      { phoneNumber, otp, deviceId },
      { headers }
    );
    return response.data;
  },

  refreshToken: async (refreshToken: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  logout: async (deviceId: string): Promise<void> => {
    await api.post('/auth/logout', { deviceId });
  },
};
