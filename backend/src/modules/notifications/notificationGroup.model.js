import mongoose from 'mongoose';

const notificationGroupSchema = new mongoose.Schema({
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      'Like',
      'Save',
      'Follow',
      'Comment',
      'AdminBroadcast',
      'System',
      'Mention',
      'ArtworkApproved',
      'ArtworkRejected',
      'Reply',
      'MarketplaceOrder',
      'Payment',
      'LiveEvent',
      'CreatorSubscription'
    ],
    required: true
  },
  targetType: {
    type: String,
    enum: ['Post', 'User', 'System'],
    default: null
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  actorCount: {
    type: Number,
    default: 1
  },
  recentActors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  latestActivityAt: {
    type: Date,
    default: Date.now
  },
  isRead: {
    type: Boolean,
    default: false
  },
  lastPushSentAt: {
    type: Date,
    default: null
  },
  groupCreatedAt: {
    type: Date,
    default: Date.now
  },
  title: {
    type: String,
    default: null
  },
  message: {
    type: String,
    default: null
  }
}, { timestamps: true });

// Index for paginated fetch (newest groups first)
notificationGroupSchema.index({ recipientId: 1, latestActivityAt: -1 });

// Index for unread count queries
notificationGroupSchema.index({ recipientId: 1, isRead: 1 });

// Compound index for group lookup (find active groups within a time window)
notificationGroupSchema.index({ recipientId: 1, type: 1, targetId: 1, groupCreatedAt: -1 });

// Index for TTL/cleanup queries
notificationGroupSchema.index({ latestActivityAt: 1 });

export const NotificationGroup = mongoose.model('NotificationGroup', notificationGroupSchema);
