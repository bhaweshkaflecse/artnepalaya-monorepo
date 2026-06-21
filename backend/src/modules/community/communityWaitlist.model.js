import mongoose from 'mongoose';

const communityWaitlistSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', sparse: true },
    email: { type: String, sparse: true },
    username: { type: String },
    source: { type: String, default: 'community' },
    type: { type: String, enum: ['community', 'marketplace'], default: 'community' },
    deviceId: { type: String, sparse: true },
  },
  { timestamps: true }
);

communityWaitlistSchema.index({ userId: 1, type: 1 });
communityWaitlistSchema.index({ deviceId: 1, type: 1 });

export const CommunityWaitlist = mongoose.model('CommunityWaitlist', communityWaitlistSchema);
