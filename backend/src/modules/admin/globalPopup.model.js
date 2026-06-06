import mongoose from 'mongoose';

const globalPopupSchema = new mongoose.Schema({
  heading: { type: String, required: true },
  icon: { type: String, enum: ['info', 'warning', 'survey', 'update', 'celebration'] },
  body: { type: String, required: true },
  ctaText: { type: String, default: null },
  ctaLink: { type: String, default: null },
  isActive: { type: Boolean, default: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

export const GlobalPopup = mongoose.model('GlobalPopup', globalPopupSchema);
