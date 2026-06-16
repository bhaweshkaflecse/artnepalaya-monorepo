import { io, Socket } from 'socket.io-client';
import { store } from '../store';
import { setNewPostsAvailable, updatePost as updateFeedPost, removePost as removeFeedPost } from '../store/slices/feedSlice';
import { updatePost as updateUserPost, removePost as removeUserPost } from '../store/slices/userSlice';
import { setUnreadCount } from '../store/slices/appSlice';

let socket: Socket | null = null;

export function connectSocket(token: string, serverUrl: string): void {
  if (socket?.connected) {
    return;
  }

  socket = io(serverUrl, {
    auth: { token },
    transports: ['websocket'],
    autoConnect: true,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected');
  });

  socket.on('disconnect', () => {
    console.log('[Socket] Disconnected');
  });

  socket.on('post.created', (_data) => {
    store.dispatch(setNewPostsAvailable(true));
  });

  socket.on('post.updated', (data) => {
    store.dispatch(updateFeedPost(data));
    store.dispatch(updateUserPost(data));
  });

  socket.on('post.deleted', (data) => {
    store.dispatch(removeFeedPost(data.postId));
    store.dispatch(removeUserPost(data.postId));
  });

  socket.on('follow.created', (_data) => {
    /* no-op for now - profile screens handle locally */
  });

  socket.on('follow.deleted', (_data) => {
    /* no-op for now */
  });

  socket.on('notification.count.changed', (data) => {
    store.dispatch(setUnreadCount(data.unreadCount));
  });
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
