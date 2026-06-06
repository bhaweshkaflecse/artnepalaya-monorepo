// src/store/slices/appSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
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
    return value === 'true';
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
      .addCase(loadAppState.fulfilled, (state, action: PayloadAction<boolean>) => {
        state.hasCompletedOnboarding = action.payload;
        state.isAppReady = true;
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
