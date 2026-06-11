import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { userService, User } from '../../services/user.service';
import { Post } from '../../services/post.service';

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
  },
});

export const { clearUserState, setProfile } = userSlice.actions;
export default userSlice.reducer;
