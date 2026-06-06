import { Tag } from './tag.model.js';
import { Router } from 'express';

const getTags = async (req, res, next) => {
  try {
    const tags = await Tag.find().sort({ usageCount: -1 }).limit(50);
    res.status(200).json({ success: true, data: tags });
  } catch (err) { next(err); }
};

const router = Router();
router.get('/', getTags);
export default router;