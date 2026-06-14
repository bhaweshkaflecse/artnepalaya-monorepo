import mongoose from 'mongoose';

const artworkTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 }
}, { timestamps: true });

export const ArtworkType = mongoose.model('ArtworkType', artworkTypeSchema);
