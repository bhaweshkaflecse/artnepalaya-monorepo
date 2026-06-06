import { Router } from 'express';
import { AppConfig } from './appConfig.model.js';
import { CmsPage } from './cmsPage.model.js';
import { GlobalPopup } from './globalPopup.model.js';

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

export default router;