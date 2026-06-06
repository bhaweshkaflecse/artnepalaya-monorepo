import { api } from './api';

export interface UserSnippet {
  _id: string;
  username: string;
  fullName: string;
  avatarUrl?: string;
}

export interface Post {
  _id: string;
  authorId: UserSnippet;
  media: { url: string; type: 'image' | 'video'; cloudinaryId: string }[];
  description?: string;
  tags: { _id: string; name: string }[];
  stats: { saves: number; likes: number };
  isLikedByMe?: boolean;
  isSavedByMe?: boolean;
  createdAt: string;
}

export interface FeedResponse {
  data: Post[];
  meta: { nextCursor: string | null; hasNextPage: boolean };
}

export const postService = {
  getFeatured: async (): Promise<Post[]> => {
    const response = await api.get('/admin/featured');
    return response.data.data;
  },

  getFeed: async (cursor?: string | null, limit: number = 15): Promise<FeedResponse> => {
    const params: any = { limit };
    if (cursor) {
      params.cursor = cursor;
    }
    const response = await api.get('/posts/feed', { params });
    return {
      data: response.data.data,
      meta: response.data.meta || { nextCursor: null, hasNextPage: false },
    };
  },

  getGuestFeed: async (cursor?: string | null, limit: number = 15): Promise<FeedResponse> => {
    const params: any = { limit };
    if (cursor) {
      params.cursor = cursor;
    }
    const response = await api.get('/posts/feed', { params });
    return {
      data: response.data.data,
      meta: response.data.meta || { nextCursor: null, hasNextPage: false },
    };
  },

  likePost: async (postId: string): Promise<void> => {
    await api.post(`/posts/${postId}/likes`);
  },

  unlikePost: async (postId: string): Promise<void> => {
    await api.delete(`/posts/${postId}/likes`);
  },

  savePost: async (postId: string): Promise<void> => {
    await api.post(`/posts/${postId}/saves`);
  },

  unsavePost: async (postId: string): Promise<void> => {
    await api.delete(`/posts/${postId}/saves`);
  },

  getPostById: async (postId: string): Promise<Post> => {
    const response = await api.get(`/posts/${postId}`);
    return response.data.data;
  },

  reportPost: async (
    postId: string,
    reason: string,
    details?: string
  ): Promise<void> => {
    await api.post('/reports', {
      targetType: 'Post',
      targetId: postId,
      reason,
      details,
    });
  },
};
