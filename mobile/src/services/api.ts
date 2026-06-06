// src/services/api.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { setTokens, logout } from '../store/slices/authSlice';

// Expo provides EXPO_PUBLIC_* env vars through the Metro bundler.
// We declare the type inline to avoid requiring @types/node.
declare const process: { env: { EXPO_PUBLIC_API_URL?: string } };
declare const __DEV__: boolean;

const BASE_URL: string = __DEV__
  ? (process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8080/api/v1')
  : 'https://api.artnepalaya.com/api/v1';

// Runtime store injection to avoid circular dependency:
// store/index.ts -> feedSlice.ts -> post.service.ts -> api.ts -> store/index.ts
let _store: any = null;

export const injectStore = (s: any) => {
  _store = s;
};

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT from SecureStore or injected store
api.interceptors.request.use(
  async (config) => {
    let token = await SecureStore.getItemAsync('accessToken');
    if (!token && _store) {
      token = _store.getState()?.auth?.accessToken;
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 with token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: InternalAxiosRequestConfig) => void;
  reject: (error: AxiosError) => void;
}> = [];

const processQueue = (error: AxiosError | null, config: InternalAxiosRequestConfig | null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (config) {
      prom.resolve(config);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    const hadAuthHeader = originalRequest.headers?.Authorization || originalRequest.headers?.authorization;
    if (error.response?.status === 401 && !originalRequest._retry && hadAuthHeader) {
      if (isRefreshing) {
        return new Promise<InternalAxiosRequestConfig>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((config) => {
          return api(config);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      let refreshTokenValue = await SecureStore.getItemAsync('refreshToken');
      if (!refreshTokenValue && _store) {
        refreshTokenValue = _store.getState()?.auth?.refreshToken;
      }

      if (!refreshTokenValue) {
        _store?.dispatch(logout());
        isRefreshing = false;
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${BASE_URL}/auth/refresh`, {
          refreshToken: refreshTokenValue,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data.data;

        _store?.dispatch(setTokens({ accessToken, refreshToken: newRefreshToken }));

        await SecureStore.setItemAsync('accessToken', accessToken);
        await SecureStore.setItemAsync('refreshToken', newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        processQueue(null, originalRequest);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as AxiosError, null);
        _store?.dispatch(logout());
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
