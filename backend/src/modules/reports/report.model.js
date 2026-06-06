import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  targetType: { type: String, enum: ['Post', 'User'], required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  reason: { type: String, required: true },
  details: { type: String, maxLength: 500, default: null },
  status: { type: String, enum: ['Pending', 'Resolved', 'Dismissed'], default: 'Pending', index: true },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

reportSchema.index({ reporterId: 1, targetType: 1, targetId: 1 }, { unique: true });

export const Report = mongoose.model('Report', reportSchema);