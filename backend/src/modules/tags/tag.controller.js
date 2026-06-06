import * as tagService from './tag.service.js';

export const searchTags = async (req, res, next) => {
  try {
    const tags = await tagService.searchTags(req.query.q, req.query.limit);
    res.status(200).json({ success: true, data: tags });
  } catch (err) { next(err); }
};