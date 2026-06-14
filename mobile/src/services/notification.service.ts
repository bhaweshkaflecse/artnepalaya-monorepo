import { api } from './api';

export interface Notification {
  _id: string;
  recipientId: string;
  senderId?: {
    _id: string;
    username: string;
    fullName: string;
    avatarUrl?: string;
  };
  postId?: {
    _id: string;
    media?: Array<{ type: string; url: string }>;
  } | string;
  type: 'Like' | 'Save' | 'Follow' | 'Comment' | 'AdminBroadcast' | 'System';
  title?: string;
  message: string;
  referenceId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  data: Notification[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalItems: number;
    unreadCount?: number;
    hasNextPage: boolean;
  };
}

export const notificationService = {
  getNotifications: async (
    filter: 'all' | 'unread' | 'read' = 'all',
    page: number = 1,
    limit: number = 20
  ): Promise<NotificationsResponse> => {
    const response = await api.get('/notifications', {
      params: { filter, page, limit },
    });
    const meta = response.data.meta || { page, limit, totalItems: 0, total: 0, hasNextPage: false };
    return {
      data: response.data.data,
      meta: {
        page: meta.currentPage || meta.page || page,
        limit: meta.limit || limit,
        total: meta.totalItems || meta.total || 0,
        totalItems: meta.totalItems || meta.total || 0,
        unreadCount: meta.unreadCount,
        hasNextPage: meta.hasNextPage || false,
      },
    };
  },

  markAllAsRead: async (): Promise<void> => {
    await api.put('/notifications/read');
  },

  markOneAsRead: async (notificationId: string): Promise<void> => {
    await api.put(`/notifications/${notificationId}/read`);
  },

  registerPushToken: async (token: string): Promise<void> => {
    await api.post('/users/me/push-token', { token });
  },

  removePushToken: async (token: string): Promise<void> => {
    await api.delete('/users/me/push-token', { data: { token } });
  },
};
