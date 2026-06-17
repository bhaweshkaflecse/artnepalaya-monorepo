import { io, Socket } from 'socket.io-client';
import { store } from '../store';
import { setNewPostsAvailable, updatePost as updateFeedPost, removePost as removeFeedPost } from '../store/slices/feedSlice';
import { updatePost as updateUserPost, removePost as removeUserPost, fetchMyPosts, incrementFollowers, decrementFollowers, incrementFollowing, decrementFollowing } from '../store/slices/userSlice';
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

  socket.on('post.created', (data: { postId: string; authorId: string }) => {
    store.dispatch(setNewPostsAvailable(true));
    // If I created this post, refresh my posts list
    const currentUserId = store.getState().auth.user?.id;
    if (data.authorId === currentUserId) {
      store.dispatch(fetchMyPosts(currentUserId));
    }
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
    if (!currentUserId) return;

    if (data.followerId === currentUserId) {
      // I followed someone -> my following count +1
      store.dispatch(incrementFollowing());
    }
    if (data.followingId === currentUserId) {
      // Someone followed me -> my followers count +1
      store.dispatch(incrementFollowers());
    }
  });

  socket.on('follow.deleted', (data: { followerId: string; followingId: string }) => {
    const currentUserId = store.getState().auth.user?.id;
    if (!currentUserId) return;

    if (data.followerId === currentUserId) {
      // I unfollowed someone -> my following count -1
      store.dispatch(decrementFollowing());
    }
    if (data.followingId === currentUserId) {
      // Someone unfollowed me -> my followers count -1
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
