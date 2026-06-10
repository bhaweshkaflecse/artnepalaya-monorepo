// src/store/slices/appSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as SecureStore from 'expo-secure-store';
import { configService, AuthMediaItem } from '../../services/config.service';

interface AppState {
  hasCompletedOnboarding: boolean;
  isAppReady: boolean;
  authBackgroundMedia: AuthMediaItem[];
  isLoadingConfig: boolean;
}

const initialState: AppState = {
  hasCompletedOnboarding: false,
  isAppReady: false,
  authBackgroundMedia: [],
  isLoadingConfig: false,
};

export const loadAppState = createAsyncThunk('app/loadAppState', async (_, { rejectWithValue }) => {
  try {
    const value = await SecureStore.getItemAsync('hasCompletedOnboarding');
    const accessToken = await SecureStore.getItemAsync('accessToken');
    const refreshToken = await SecureStore.getItemAsync('refreshToken');
    const userDataStr = await SecureStore.getItemAsync('userData');

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
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadAppState.fulfilled, (state, action) => {
        state.hasCompletedOnboarding = action.payload.hasCompletedOnboarding;
        state.isAppReady = true;
        // Auth state restoration is handled via the returned payload
        // The App component will dispatch setCredentials if tokens are found
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

export const { setOnboardingComplete } = appSlice.actions;
export default appSlice.reducer;
