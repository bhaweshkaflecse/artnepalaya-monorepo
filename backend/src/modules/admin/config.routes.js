import { Router } from 'express';
import { AppConfig } from './appConfig.model.js';
import { CmsPage } from './cmsPage.model.js';
import { GlobalPopup } from './globalPopup.model.js';
import { FeaturedPost } from './featured.model.js';
import { ArtworkType } from './artworkType.model.js';
import { Post } from '../posts/post.model.js';
import { optionalAuth } from '../../middlewares/optionalAuth.js';

const router = Router();

// Public endpoint - no auth required
// Resolves stored postIds to media URLs for the mobile login carousel
router.get('/auth-media', async (req, res, next) => {
  try {
    const config = await AppConfig.findOne({ key: 'auth_background_media' }).lean();
    const storedValue = config ? config.value : [];

    // New format: array of postId strings
    if (Array.isArray(storedValue) && storedValue.length > 0 && typeof storedValue[0] === 'string') {
      const postIds = storedValue;
      const posts = await Post.find({ _id: { $in: postIds }, deletedAt: null })
        .select('media authorId caption')
        .populate('authorId', 'username')
        .lean();

      // Build a map to maintain the stored order
      const postMap = {};
      posts.forEach((p) => { postMap[p._id.toString()] = p; });

      const resolved = postIds
        .filter((id) => postMap[id])
        .map((id) => {
          const p = postMap[id];
          return {
            url: p.media?.[0]?.url || '',
            type: p.media?.[0]?.type || 'image',
            postId: p._id,
            caption: p.caption || '',
            artist: p.authorId?.username || '',
          };
        });

      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      return res.status(200).json({ success: true, data: resolved });
    }

    // Legacy format: already [{url, type}] objects - return as-is for backward compatibility
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.status(200).json({ success: true, data: storedValue });
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
    const now = new Date();
    const popup = await GlobalPopup.findOne({
      isActive: true,
      isArchived: false,
      $and: [
        { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] }
      ]
    }).sort({ priority: -1, createdAt: -1 }).lean();
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
          select: '_id username avatarUrl status deletionRequested'
        }
      })
      .lean();

    // Filter out entries where the post no longer exists
    let data = featured
      .filter((f) => f.postId != null && !f.postId.deletedAt)
      .map((f) => f.postId);

    // NSFW Protection: Exclude NSFW posts for guests and users without mature content opt-in
    const showMatureContent = req.user?.showMatureContent ?? true;
    if (!req.user || !showMatureContent) {
      data = data.filter((post) => !post.isNsfw);
    }

    // Filter out posts from banned/suspended authors
    data = data.filter((post) => post.authorId && post.authorId.status === 'active' && !post.authorId.deletionRequested);

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