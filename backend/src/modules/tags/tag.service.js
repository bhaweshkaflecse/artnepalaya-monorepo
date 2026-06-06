import { Tag } from './tag.model.js';

export const searchTags = async (searchQuery, limit) => {
  const query = {};
  if (searchQuery) {
    const safeQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.name = { $regex: new RegExp('^' + safeQuery, 'i') };
  }
  return Tag.find(query).sort({ postCount: -1 }).limit(limit).select('name postCount -_id').lean();
};

export const incrementTags = async (tagArray) => {
  if (!tagArray || tagArray.length === 0) return;
  const normalizedTags = tagArray.map(t => t.toLowerCase().trim());
  const bulkOps = normalizedTags.map(tag => ({
    updateOne: { filter: { name: tag }, update: { $inc: { postCount: 1 } }, upsert: true }
  }));
  await Tag.bulkWrite(bulkOps, { ordered: false });
};