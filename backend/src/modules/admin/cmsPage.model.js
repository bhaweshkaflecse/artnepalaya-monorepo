import mongoose from 'mongoose';

const cmsPageSchema = new mongoose.Schema({
  slug: {
    type: String,
    unique: true,
    required: true,
    enum: ['privacy-policy', 'about-us', 'terms-conditions', 'community-guidelines']
  },
  title: { type: String, required: true },
  content: { type: String, required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

export const CmsPage = mongoose.model('CmsPage', cmsPageSchema);
