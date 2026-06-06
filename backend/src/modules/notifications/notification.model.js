import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null },
  type: { type: String, enum: ['Like', 'Save', 'Follow', 'Comment', 'AdminBroadcast', 'System'], required: true },
  title: { type: String, default: null },
  message: { type: String, default: null },
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, isRead: 1 });

export const Notification = mongoose.model('Notification', notificationSchema);