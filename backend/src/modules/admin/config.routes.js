import { Router } from 'express';
import { AppConfig } from './appConfig.model.js';
import { CmsPage } from './cmsPage.model.js';
import { GlobalPopup } from './globalPopup.model.js';
import { FeaturedPost } from './featured.model.js';
import { ArtworkType } from './artworkType.model.js';
import { optionalAuth } from '../../middlewares/optionalAuth.js';

const router = Router();

// Public endpoint - no auth required
router.get('/auth-media', async (req, res, next) => {
  try {
    const config = await AppConfig.findOne({ key: 'auth_background_media' }).lean();
    res.status(200).json({ 
      success: true, 
      data: config ? config.value : [] 
    });
  } catch (err) {
    next(err);
  }
});

// Public CMS page endpoint - no auth required
router.get('/cms/:slug', async (req, res, next) => {
  try {
    const page = await CmsPage.findOne({ slug: req.params.slug }).lean();
    if (!page) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Page not found' } });
    }
    res.status(200).json({ success: true, data: page });
  } catch (err) {
    next(err);
  }
});

// Public global popup endpoint - no auth required (returns active popup)
router.get('/global-popup', async (req, res, next) => {
  try {
    const popup = await GlobalPopup.findOne({ isActive: true }).sort({ updatedAt: -1 }).lean();
    res.status(200).json({ success: true, data: popup || null });
  } catch (err) {
    next(err);
  }
});

// Public featured posts endpoint - optionalAuth for NSFW filtering
router.get('/featured', optionalAuth, async (req, res, next) => {
  try {
    const now = new Date();
    const featured = await FeaturedPost.find({
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }]
    })
      .sort({ sortOrder: 1 })
      .populate({
        path: 'postId',
        populate: {
          path: 'authorId',
          select: '_id username avatarUrl status'
        }
      })
      .lean();

    // Filter out entries where the post no longer exists
    let data = featured
      .filter((f) => f.postId != null)
      .map((f) => f.postId);

    // NSFW Protection: Exclude NSFW posts for guests and users without mature content opt-in
    const showMatureContent = req.user?.showMatureContent || false;
    if (!req.user || !showMatureContent) {
      data = data.filter((post) => !post.isNsfw);
    }

    // Filter out posts from banned/suspended authors
    data = data.filter((post) => post.authorId && post.authorId.status === 'active');

    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// Public artwork types endpoint - no auth required
router.get('/artwork-types', async (req, res, next) => {
  try {
    const types = await ArtworkType.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean();
    res.status(200).json({ success: true, data: types });
  } catch (err) {
    next(err);
  }
});

export default router;