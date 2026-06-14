import mongoose from 'mongoose';
const featuredPostSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, unique: true },
  featuredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sortOrder: { type: Number, default: 0 },
  expiresAt: { type: Date, default: null }
}, { timestamps: true });
export const FeaturedPost = mongoose.model('FeaturedPost', featuredPostSchema);
