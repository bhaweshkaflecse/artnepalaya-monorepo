import mongoose from 'mongoose';

const tagSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  postCount: { type: Number, default: 1, index: -1 }
}, { timestamps: true });

export const Tag = mongoose.model('Tag', tagSchema);