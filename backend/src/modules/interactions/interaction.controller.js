import { Save } from './save.model.js';
import { Post } from '../posts/post.model.js';

export const toggleSave = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;
    
    // Check if it's already saved
    const existingSave = await Save.findOneAndDelete({ userId, postId });
    
    if (existingSave) {
      // If it existed, we just deleted it. Decrement the counter.
      await Post.findByIdAndUpdate(postId, { $inc: { 'stats.saves': -1 } });
      return res.status(200).json({ success: true, message: 'Unsaved' });
    }
    
    // If it didn't exist, create it and increment the counter.
    await Save.create({ userId, postId });
    await Post.findByIdAndUpdate(postId, { $inc: { 'stats.saves': 1 } });
    
    res.status(200).json({ success: true, message: 'Saved' });
  } catch (err) { 
    next(err); 
  }
};