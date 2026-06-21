import { Router } from 'express';
import { authGuard } from '../../middlewares/authGuard.js';
import { requireRole } from '../../middlewares/roleGuard.js';
import { validate } from '../../middlewares/validator.js';
import * as validation from './admin.validation.js';
import * as controller from './admin.controller.js';
import { getInterestUsers } from '../community/community.controller.js';

const router = Router();
router.use(authGuard);
router.use(requireRole(['Admin'])); // Strictly lock all routes in this file

router.get('/dashboard', controller.getDashboardStats);
router.get('/analytics', controller.getAnalytics);
router.get('/users', validate(validation.queryPaginationSchema), controller.getUsers);
router.put('/users/:userId/status', validate(validation.updateUserStatusSchema), controller.updateUserStatus);

router.get('/reports', validate(validation.queryPaginationSchema), controller.getReports);
router.put('/reports/:reportId/resolve', validate(validation.reportIdParamsSchema), controller.resolveReport);
router.put('/reports/:reportId/notes', validate(validation.reportIdParamsSchema), controller.updateReportNotes);

router.delete('/posts/:postId', validate(validation.postIdParamsSchema), controller.deletePost);
router.put('/posts/:postId/restore', validate(validation.postIdParamsSchema), controller.restorePost);
router.get('/posts', controller.getPosts);

router.get('/featured', controller.getFeatured);
router.post('/featured', validate(validation.featurePostSchema), controller.addFeatured);
router.delete('/featured/:postId', validate(validation.postIdParamsSchema), controller.removeFeatured);

router.get('/config/auth-media', controller.getAuthMedia);
router.put('/config/auth-media', controller.updateAuthMedia);

router.post('/notifications/broadcast', controller.broadcastNotification);
router.get('/notifications/history', controller.getBroadcastHistory);

router.get('/push-stats', controller.getPushStats);

router.get('/debug/posts', controller.getDebugPosts);

router.get('/cms/:slug', controller.getCmsPage);
router.put('/cms/:slug', controller.updateCmsPage);

router.get('/community-interest', getInterestUsers);

router.get('/global-popup', controller.getGlobalPopup);
router.post('/global-popup', controller.createGlobalPopup);
router.put('/global-popup/:id', controller.updateGlobalPopup);
router.put('/global-popup/:id/archive', controller.archiveGlobalPopup);

// Artwork Type Management
router.get('/artwork-types', controller.getArtworkTypes);
router.post('/artwork-types', controller.createArtworkType);
router.put('/artwork-types/:id', controller.updateArtworkType);
router.patch('/artwork-types/:id/toggle', controller.toggleArtworkType);

// Tag Management
router.get('/tags', controller.getAdminTags);
router.post('/tags', controller.createAdminTag);
router.put('/tags/:id', controller.updateAdminTag);
router.delete('/tags/:id', controller.deleteAdminTag);
router.post('/tags/merge', controller.mergeAdminTags);

// Feed Analytics
router.get('/feed-analytics', controller.getFeedAnalytics);

// Featured Content Ordering & Expiry
router.put('/featured/:postId/order', controller.updateFeaturedOrder);
router.put('/featured/:postId/expiry', controller.updateFeaturedExpiry);

// Search Insights
router.get('/search-insights', controller.getSearchInsights);

// User Verification
router.put('/users/:userId/verify', controller.verifyUser);
router.put('/users/:userId/unverify', controller.unverifyUser);

export default router;