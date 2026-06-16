import { io } from './socketServer.js';

export function emitToFeed(eventName, payload) {
  if (io) {
    io.to('feed').emit(eventName, payload);
  }
}

export function emitToUser(userId, eventName, payload) {
  if (io) {
    io.to(`user:${userId}`).emit(eventName, payload);
  }
}
