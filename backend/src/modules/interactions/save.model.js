import mongoose from 'mongoose';

const saveSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true }
}, { timestamps: { createdAt: true, updatedAt: false } });

saveSchema.index({ userId: 1, postId: 1 }, { unique: true });
export const Save = mongoose.model('Save', saveSchema);