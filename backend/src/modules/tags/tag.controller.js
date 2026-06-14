import * as tagService from './tag.service.js';
import { SearchLog } from '../admin/searchLog.model.js';

export const searchTags = async (req, res, next) => {
  try {
    const tags = await tagService.searchTags(req.query.q, req.query.limit);
    res.status(200).json({ success: true, data: tags });

    // Log the search query asynchronously (fire-and-forget)
    const query = req.query.q;
    if (query && query.trim()) {
      SearchLog.findOneAndUpdate(
        { query: query.toLowerCase().trim() },
        { $inc: { count: 1 }, $set: { lastSearchedAt: new Date() } },
        { upsert: true, new: true }
      ).catch(() => {});
    }
  } catch (err) { next(err); }
};
