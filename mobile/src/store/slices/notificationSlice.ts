import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { NotificationGroup } from '../../services/notification.service';
import { RootState } from '../index';

interface NotificationState {
  notifications: NotificationGroup[];
  isLoaded: boolean;
}

const initialState: NotificationState = {
  notifications: [],
  isLoaded: false,
};

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setNotifications(state, action: PayloadAction<NotificationGroup[]>) {
      state.notifications = action.payload;
      state.isLoaded = true;
    },
    upsertNotification(state, action: PayloadAction<NotificationGroup>) {
      const incoming = action.payload;
      const existingIndex = state.notifications.findIndex(
        (n) => n._id === incoming._id
      );
      if (existingIndex >= 0) {
        // Remove from current position and prepend (move to top)
        state.notifications.splice(existingIndex, 1);
      }
      // Prepend to top of list
      state.notifications.unshift(incoming);
      // Cap at 100 entries to prevent unbounded growth from socket pushes
      if (state.notifications.length > 100) {
        state.notifications = state.notifications.slice(0, 100);
      }
    },
    markNotificationRead(state, action: PayloadAction<string>) {
      const notification = state.notifications.find((n) => n._id === action.payload);
      if (notification) {
        notification.isRead = true;
      }
    },
    markAllRead(state) {
      state.notifications.forEach((n) => {
        n.isRead = true;
      });
    },
  },
});

export const {
  setNotifications,
  upsertNotification,
  markNotificationRead,
  markAllRead,
} = notificationSlice.actions;

export const selectNotifications = (state: RootState) => state.notifications.notifications;
export const selectNotificationsLoaded = (state: RootState) => state.notifications.isLoaded;

export default notificationSlice.reducer;
