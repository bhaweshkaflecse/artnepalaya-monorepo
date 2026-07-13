// src/store/slices/appSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as SecureStore from 'expo-secure-store';
import { configService, AuthMediaItem } from '../../services/config.service';
import { safeGetItemAsync } from '../../utils/secureStore';

interface AppState {
  hasCompletedOnboarding: boolean;
  needsUserOnboarding: boolean;
  isAppReady: boolean;
  authBackgroundMedia: AuthMediaItem[];
  isLoadingConfig: boolean;
  unreadNotificationCount: number;
}

const initialState: AppState = {
  hasCompletedOnboarding: false,
  needsUserOnboarding: false,
  isAppReady: false,
  authBackgroundMedia: [],
  isLoadingConfig: false,
  unreadNotificationCount: 0,
};

export const loadAppState = createAsyncThunk('app/loadAppState', async (_, { rejectWithValue }) => {
  try {
    const value = await safeGetItemAsync('hasCompletedOnboarding');
    const needsUserOnboardingValue = await safeGetItemAsync('needsUserOnboarding');
    const accessToken = await safeGetItemAsync('accessToken');
    const refreshToken = await safeGetItemAsync('refreshToken');

    // Prevent orphaned access tokens from triggering refresh attempts
    if (accessToken && !refreshToken) {
      await SecureStore.deleteItemAsync('accessToken');
      return {
        hasCompletedOnboarding: value === 'true',
        needsUserOnboarding: needsUserOnboardingValue === 'true',
        accessToken: null,
        refreshToken: null,
        userData: null,
      };
    }

    const userDataStr = await safeGetItemAsync('userData');

    let userData = null;
    if (userDataStr) {
      try {
        userData = JSON.parse(userDataStr);
      } catch {
        userData = null;
      }
    }

    return {
      hasCompletedOnboarding: value === 'true',
      needsUserOnboarding: needsUserOnboardingValue === 'true',
      accessToken: accessToken || null,
      refreshToken: refreshToken || null,
      userData,
    };
  } catch (error: any) {
    return rejectWithValue('Failed to load app state');
  }
});

export const fetchAuthConfig = createAsyncThunk('app/fetchAuthConfig', async (_, { rejectWithValue }) => {
  try {
    const media = await configService.fetchAuthBackgroundMedia();
    return media;
  } catch (error: any) {
    return rejectWithValue(error?.response?.data?.message || 'Failed to load auth config');
  }
});

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setOnboardingComplete(state) {
      state.hasCompletedOnboarding = true;
    },
    resetOnboarding(state) {
      state.hasCompletedOnboarding = false;
    },
    setNeedsUserOnboarding(state) {
      state.needsUserOnboarding = true;
    },
    clearNeedsUserOnboarding(state) {
      state.needsUserOnboarding = false;
    },
    setUnreadCount(state, action: PayloadAction<number>) {
      state.unreadNotificationCount = action.payload;
    },
    setAppReady(state) {
      state.isAppReady = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadAppState.fulfilled, (state, action) => {
        state.hasCompletedOnboarding = action.payload.hasCompletedOnboarding;
        state.needsUserOnboarding = action.payload.needsUserOnboarding;
        // isAppReady is NOT set here - App.tsx will dispatch setAppReady after
        // restoring auth state to prevent the flash of unauthenticated state
      })
      .addCase(loadAppState.rejected, (state) => {
        state.isAppReady = true;
      })
      .addCase(fetchAuthConfig.pending, (state) => {
        state.isLoadingConfig = true;
      })
      .addCase(fetchAuthConfig.fulfilled, (state, action) => {
        state.isLoadingConfig = false;
        state.authBackgroundMedia = action.payload;
      })
      .addCase(fetchAuthConfig.rejected, (state) => {
        state.isLoadingConfig = false;
      });
  },
});

export const { setOnboardingComplete, resetOnboarding, setNeedsUserOnboarding, clearNeedsUserOnboarding, setUnreadCount, setAppReady } = appSlice.actions;
export default appSlice.reducer;
