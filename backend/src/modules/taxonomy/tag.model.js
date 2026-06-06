import mongoose from 'mongoose';

const tagSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, lowercase: true, trim: true },
  type: { type: String, enum: ['system', 'user_suggested', 'art_form'], default: 'user_suggested' },
  usageCount: { type: Number, default: 0 }
});
export const Tag = mongoose.model('Tag', tagSchema);