import { api } from './api';

export interface NotificationGroup {
  _id: string;
  recipientId: string;
  type: 'Like' | 'Save' | 'Follow' | 'Comment' | 'AdminBroadcast' | 'System' | 'Mention' | 'ArtworkApproved' | 'ArtworkRejected' | 'Reply';
  targetType: 'Post' | 'User' | 'System' | null;
  targetId?: { _id: string; media?: Array<{ type: string; url: string }>; title?: string } | string | null;
  actorCount: number;
  recentActors: Array<{ _id: string; username: string; avatarUrl?: string }>;
  latestActivityAt: string;
  isRead: boolean;
  lastPushSentAt?: string | null;
  groupCreatedAt: string;
  title?: string | null;
  message?: string | null;
}

/** Backward-compatible alias */
export type Notification = NotificationGroup;

export interface NotificationsResponse {
  data: NotificationGroup[];
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

  registerPushToken: async (token: string, accessToken?: string): Promise<void> => {
    if (__DEV__) console.log('[PushReg] API call starting...');
    try {
      const config = accessToken
        ? { headers: { Authorization: `Bearer ${accessToken}` } }
        : undefined;
      await api.post('/users/me/push-token', { token }, config);
    } catch (error: any) {
      console.error('[PushReg] API call FAILED:', error.response?.status, error.response?.data, error.message);
      throw error;
    }
  },

  removePushToken: async (token: string): Promise<void> => {
    await api.delete('/users/me/push-token', { data: { token } });
  },
};
