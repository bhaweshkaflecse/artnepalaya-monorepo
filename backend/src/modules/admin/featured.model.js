import mongoose from 'mongoose';
const featuredPostSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, unique: true },
  featuredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });
export const FeaturedPost = mongoose.model('FeaturedPost', featuredPostSchema);