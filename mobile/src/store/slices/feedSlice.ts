import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Post, postService } from '../../services/post.service';

interface FeedState {
  feedPosts: Post[];
  featuredPosts: Post[];
  cursor: string | null;
  hasNextPage: boolean;
  isLoadingFeed: boolean;
  isLoadingFeatured: boolean;
  isLoadingMore: boolean;
  error: string | null;
  newPostsAvailable: boolean;
}

const initialState: FeedState = {
  feedPosts: [],
  featuredPosts: [],
  cursor: null,
  hasNextPage: true,
  isLoadingFeed: false,
  isLoadingFeatured: false,
  isLoadingMore: false,
  error: null,
  newPostsAvailable: false,
};

export const fetchFeed = createAsyncThunk(
  'feed/fetchFeed',
  async (_, { rejectWithValue }) => {
    try {
      const response = await postService.getFeed(null, 15);
      return response;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || 'Failed to load feed');
    }
  }
);

export const fetchMoreFeed = createAsyncThunk(
  'feed/fetchMoreFeed',
  async (_, thunkAPI: any) => {
    const state = thunkAPI.getState();
    const { cursor } = state.feed;

    try {
      const response = await postService.getFeed(cursor, 15);
      return response;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error?.response?.data?.message || 'Failed to load more posts');
    }
  },
  {
    condition: (_, { getState }: any) => {
      const { cursor, hasNextPage, isLoadingMore } = (getState() as any).feed;
      // Prevent duplicate requests or fetching past the end
      if (!cursor || !hasNextPage || isLoadingMore) {
        return false;
      }
      return true;
    },
  }
);

export const fetchFeatured = createAsyncThunk(
  'feed/fetchFeatured',
  async (_, { rejectWithValue }) => {
    try {
      const response = await postService.getFeatured();
      return response;
    } catch (error: any) {
      return rejectWithValue(error?.response?.data?.message || 'Failed to load featured posts');
    }
  }
);

const feedSlice = createSlice({
  name: 'feed',
  initialState,
  reducers: {
    setNewPostsAvailable(state, action: PayloadAction<boolean>) {
      state.newPostsAvailable = action.payload;
    },
    toggleLike(state, action: PayloadAction<string>) {
      const postId = action.payload;
      const post = state.feedPosts.find((p) => p._id === postId);
      if (post) {
        post.isLikedByMe = !post.isLikedByMe;
        post.likesCount += post.isLikedByMe ? 1 : -1;
      }
    },
    toggleSave(state, action: PayloadAction<string>) {
      const postId = action.payload;
      const post = state.feedPosts.find((p) => p._id === postId);
      if (post) {
        post.isSavedByMe = !post.isSavedByMe;
        post.savesCount += post.isSavedByMe ? 1 : -1;
      }
    },
    removePost(state, action: PayloadAction<string>) {
      state.feedPosts = state.feedPosts.filter((p) => p._id !== action.payload);
    },
    updatePost(state, action: PayloadAction<{ postId: string; data: Partial<Post> }>) {
      const idx = state.feedPosts.findIndex((p) => p._id === action.payload.postId);
      if (idx !== -1) {
        state.feedPosts[idx] = { ...state.feedPosts[idx], ...action.payload.data };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFeed.pending, (state) => {
        state.isLoadingFeed = true;
        state.error = null;
      })
      .addCase(fetchFeed.fulfilled, (state, action) => {
        state.isLoadingFeed = false;
        state.error = null;
        state.feedPosts = action.payload.data;
        state.cursor = action.payload.meta.nextCursor;
        state.hasNextPage = action.payload.meta.hasNextPage;
        state.newPostsAvailable = false;
      })
      .addCase(fetchFeed.rejected, (state, action) => {
        state.isLoadingFeed = false;
        state.error = action.error.message || 'Failed to load feed';
      })
      .addCase(fetchMoreFeed.pending, (state) => {
        state.isLoadingMore = true;
      })
      .addCase(fetchMoreFeed.fulfilled, (state, action) => {
        state.isLoadingMore = false;
        if (action.payload) {
          state.feedPosts = [...state.feedPosts, ...action.payload.data];
          state.cursor = action.payload.meta.nextCursor;
          state.hasNextPage = action.payload.meta.hasNextPage;
        }
      })
      .addCase(fetchMoreFeed.rejected, (state, action) => {
        state.isLoadingMore = false;
        state.error = action.error.message || 'Failed to load more posts';
      })
      .addCase(fetchFeatured.pending, (state) => {
        state.isLoadingFeatured = true;
      })
      .addCase(fetchFeatured.fulfilled, (state, action) => {
        state.isLoadingFeatured = false;
        state.featuredPosts = action.payload;
      })
      .addCase(fetchFeatured.rejected, (state, action) => {
        state.isLoadingFeatured = false;
        state.error = action.error.message || 'Failed to load featured posts';
      });
  },
});

export const { setNewPostsAvailable, toggleLike, toggleSave, removePost, updatePost } = feedSlice.actions;
export default feedSlice.reducer;
