import { io, Socket } from 'socket.io-client';
import { store } from '../store';
import { setNewPostsAvailable, updatePost as updateFeedPost, removePost as removeFeedPost } from '../store/slices/feedSlice';
import { updatePost as updateUserPost, removePost as removeUserPost, incrementFollowers, decrementFollowers, incrementFollowing, decrementFollowing } from '../store/slices/userSlice';
import { setUnreadCount } from '../store/slices/appSlice';

let socket: Socket | null = null;

export function connectSocket(token: string, serverUrl: string): void {
  if (socket?.connected) {
    return;
  }

  // Clean up any existing disconnected socket to prevent orphans and duplicate listeners
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  console.log('[Socket] Attempting connection to:', serverUrl);

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

  socket.on('connect_error', (err) => {
    console.error('[Socket] Connection error:', err.message);
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

  socket.on('follow.created', (data: { followerId: string; followingId: string }) => {
    const currentUserId = store.getState().auth.user?.id;
    console.log('[Socket] follow.created received:', data, 'currentUserId:', currentUserId);
    if (!currentUserId) return;

    if (data.followerId === currentUserId) {
      console.log('[Socket] Dispatching incrementFollowing');
      store.dispatch(incrementFollowing());
    }
    if (data.followingId === currentUserId) {
      console.log('[Socket] Dispatching incrementFollowers');
      store.dispatch(incrementFollowers());
    }
  });

  socket.on('follow.deleted', (data: { followerId: string; followingId: string }) => {
    const currentUserId = store.getState().auth.user?.id;
    console.log('[Socket] follow.deleted received:', data, 'currentUserId:', currentUserId);
    if (!currentUserId) return;

    if (data.followerId === currentUserId) {
      console.log('[Socket] Dispatching decrementFollowing');
      store.dispatch(decrementFollowing());
    }
    if (data.followingId === currentUserId) {
      console.log('[Socket] Dispatching decrementFollowers');
      store.dispatch(decrementFollowers());
    }
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
