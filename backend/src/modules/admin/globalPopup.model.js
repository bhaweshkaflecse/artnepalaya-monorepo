import mongoose from 'mongoose';

const globalPopupSchema = new mongoose.Schema({
  heading: { type: String, required: true },
  icon: { type: String, enum: ['info', 'warning', 'survey', 'update', 'celebration'] },
  body: { type: String, required: true },
  ctaText: { type: String, default: null },
  ctaLink: { type: String, default: null },
  isActive: { type: Boolean, default: true },
  frequency: { type: String, enum: ['show_once', 'every_login', 'every_7_days', 'every_30_days'], default: 'show_once' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isArchived: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  startsAt: { type: Date, default: null },
  endsAt: { type: Date, default: null },
  priority: { type: Number, default: 0 }
}, { timestamps: true });

export const GlobalPopup = mongoose.model('GlobalPopup', globalPopupSchema);
