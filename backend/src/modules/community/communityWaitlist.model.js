import mongoose from 'mongoose';

const communityWaitlistSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  },
  { timestamps: true }
);

export const CommunityWaitlist = mongoose.model('CommunityWaitlist', communityWaitlistSchema);
