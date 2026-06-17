import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { userService, User } from '../../services/user.service';
import { Post } from '../../services/post.service';
import { logout } from './authSlice';

interface UserState {
  profile: User | null;
  myPosts: Post[];
  savedPosts: Post[];
  isLoading: boolean;
}

const initialState: UserState = {
  profile: null,
  myPosts: [],
  savedPosts: [],
  isLoading: false,
};

export const fetchProfile = createAsyncThunk('user/fetchProfile', async () => {
  const user = await userService.getMe();
  return user;
});

export const fetchMyPosts = createAsyncThunk(
  'user/fetchMyPosts',
  async (userId: string) => {
    const response = await userService.getUserPosts(userId);
    return response.data;
  }
);

export const fetchSavedPosts = createAsyncThunk(
  'user/fetchSavedPosts',
  async () => {
    const response = await userService.getSavedPosts();
    return response.data;
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearUserState(state) {
      state.profile = null;
      state.myPosts = [];
      state.savedPosts = [];
      state.isLoading = false;
    },
    setProfile(state, action) {
      state.profile = action.payload;
    },
    removePost(state, action: PayloadAction<string>) {
      state.myPosts = state.myPosts.filter((p) => p._id !== action.payload);
      state.savedPosts = state.savedPosts.filter((p) => p._id !== action.payload);
    },
    updatePost(state, action: PayloadAction<{ postId: string; data: Partial<Post> }>) {
      const { postId, data } = action.payload;
      const myIdx = state.myPosts.findIndex((p) => p._id === postId);
      if (myIdx !== -1) {
        state.myPosts[myIdx] = { ...state.myPosts[myIdx], ...data };
      }
      const savedIdx = state.savedPosts.findIndex((p) => p._id === postId);
      if (savedIdx !== -1) {
        state.savedPosts[savedIdx] = { ...state.savedPosts[savedIdx], ...data };
      }
    },
    prependPost(state, action: PayloadAction<Post>) {
      state.myPosts = [action.payload, ...state.myPosts];
    },
    incrementFollowers(state) {
      if (state.profile && state.profile.stats) {
        state.profile.stats.followers = (state.profile.stats.followers || 0) + 1;
      }
    },
    decrementFollowers(state) {
      if (state.profile && state.profile.stats) {
        state.profile.stats.followers = Math.max(0, (state.profile.stats.followers || 0) - 1);
      }
    },
    incrementFollowing(state) {
      if (state.profile && state.profile.stats) {
        state.profile.stats.following = (state.profile.stats.following || 0) + 1;
      }
    },
    decrementFollowing(state) {
      if (state.profile && state.profile.stats) {
        state.profile.stats.following = Math.max(0, (state.profile.stats.following || 0) - 1);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfile.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.profile = action.payload;
      })
      .addCase(fetchProfile.rejected, (state) => {
        state.isLoading = false;
      })
      .addCase(fetchMyPosts.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchMyPosts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.myPosts = action.payload;
      })
      .addCase(fetchMyPosts.rejected, (state) => {
        state.isLoading = false;
      })
      .addCase(fetchSavedPosts.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchSavedPosts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.savedPosts = action.payload;
      })
      .addCase(fetchSavedPosts.rejected, (state) => {
        state.isLoading = false;
      });

    builder.addCase(logout, (state) => {
      state.profile = null;
      state.myPosts = [];
      state.savedPosts = [];
      state.isLoading = false;
    });
  },
});

export const { clearUserState, setProfile, removePost, updatePost, prependPost, incrementFollowers, decrementFollowers, incrementFollowing, decrementFollowing } = userSlice.actions;
export default userSlice.reducer;
