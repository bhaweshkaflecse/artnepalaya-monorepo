import mongoose from 'mongoose';

const mediaSchema = new mongoose.Schema({
  url: { type: String, required: true },
  providerId: { type: String, required: true }, // Cloudinary public_id
  type: { type: String, enum: ['image', 'video'], required: true }
}, { _id: false });

const postSchema = new mongoose.Schema({
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  media: { type: [mediaSchema], required: true },
  caption: { type: String, maxLength: 2200, default: '' },
  
  // Strings match our fast Feed algorithm perfectly!
  tags: { type: [String], index: true }, 

  // Artwork type categorization
  artworkType: { type: [String], default: [] },
  
  // AI Declaration Flag - kept for backward compatibility
  isHumanMade: { type: Boolean, required: true },

  // Original Content Declaration
  isOriginalContent: { type: Boolean, default: false },

  // AI-Generated/Assisted flag
  isAIGenerated: { type: Boolean, default: false },
  
  // NSFW flag for content moderation
  isNsfw: { type: Boolean, default: false },

  // Soft delete
  deletedAt: { type: Date, default: null },

  // Metrics
  likesCount: { type: Number, default: 0 },
  savesCount: { type: Number, default: 0 }
}, {
  timestamps: true
});

// === Performance Optimization Indexes ===
// 1. Optimize cursor pagination (sorting by _id descending for the main feed)
// postSchema.index({ _id: -1 });

// 2. Optimize fetching a specific user's posts chronologically (Profile screen)
postSchema.index({ authorId: 1, _id: -1 });

// 3. Optimize the in-memory ranking query (tag matching)
postSchema.index({ tags: 1 });

export const Post = mongoose.model('Post', postSchema);