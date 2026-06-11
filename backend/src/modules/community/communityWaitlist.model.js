import mongoose from 'mongoose';

const communityWaitlistSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', sparse: true },
    email: { type: String, sparse: true },
    username: { type: String },
    source: { type: String, default: 'community' },
    deviceId: { type: String, sparse: true },
  },
  { timestamps: true }
);

communityWaitlistSchema.index({ userId: 1 }, { unique: true, sparse: true });
communityWaitlistSchema.index({ deviceId: 1 }, { unique: true, sparse: true });

export const CommunityWaitlist = mongoose.model('CommunityWaitlist', communityWaitlistSchema);
