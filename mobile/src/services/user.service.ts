import { api } from './api';
import { Post } from './post.service';

export interface UserStats {
  followers: number;
  following: number;
}

export interface User {
  _id: string;
  email: string;
  username: string;
  fullName: string;
  avatarUrl?: string;
  bio?: string;
  role: string;
  subRoles?: string[];
  phoneNumber?: string;
  stats: UserStats;
  isAdult?: boolean;
  nsfwBlurEnabled?: boolean;
  status?: string;
}

export interface UserPostsResponse {
  data: Post[];
  meta: any;
}

export const userService = {
  getMe: async (): Promise<User> => {
    const response = await api.get('/users/me');
    return response.data.data;
  },

  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await api.put('/users/me', data);
    return response.data.data;
  },

  getPublicProfile: async (userId: string): Promise<User> => {
    const response = await api.get(`/users/${userId}`);
    return response.data.data;
  },

  getUserPosts: async (
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<UserPostsResponse> => {
    const response = await api.get(`/users/${userId}/posts`, {
      params: { page, limit },
    });
    return {
      data: response.data.data,
      meta: response.data.meta,
    };
  },

  getSavedPosts: async (
    page: number = 1,
    limit: number = 15
  ): Promise<UserPostsResponse> => {
    const response = await api.get('/users/me/saved', {
      params: { page, limit },
    });
    return {
      data: response.data.data,
      meta: response.data.meta,
    };
  },

  followUser: async (userId: string): Promise<void> => {
    await api.post(`/users/${userId}/follow`);
  },

  unfollowUser: async (userId: string): Promise<void> => {
    await api.delete(`/users/${userId}/follow`);
  },

  getFollowers: async (userId: string, page: number = 1, limit: number = 20) => {
    const response = await api.get(`/users/${userId}/followers`, {
      params: { page, limit },
    });
    return response.data;
  },

  getFollowing: async (userId: string, page: number = 1, limit: number = 20) => {
    const response = await api.get(`/users/${userId}/following`, {
      params: { page, limit },
    });
    return response.data;
  },
};
