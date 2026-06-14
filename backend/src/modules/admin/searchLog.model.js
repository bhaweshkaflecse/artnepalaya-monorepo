import mongoose from 'mongoose';

const searchLogSchema = new mongoose.Schema({
  query: { type: String, required: true, lowercase: true, trim: true, unique: true },
  count: { type: Number, default: 1 },
  lastSearchedAt: { type: Date, default: Date.now }
}, { timestamps: true });

searchLogSchema.index({ count: -1 });
searchLogSchema.index({ lastSearchedAt: -1 });

export const SearchLog = mongoose.model('SearchLog', searchLogSchema);
