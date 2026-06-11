import { Router } from 'express';
import { authGuard } from '../../middlewares/authGuard.js';
import { requireRole } from '../../middlewares/roleGuard.js';
import { validate } from '../../middlewares/validator.js';
import * as validation from './admin.validation.js';
import * as controller from './admin.controller.js';

const router = Router();
router.use(authGuard);
router.use(requireRole(['Admin'])); // Strictly lock all routes in this file

router.get('/dashboard', controller.getDashboardStats);
router.get('/analytics', controller.getAnalytics);
router.get('/users', validate(validation.queryPaginationSchema), controller.getUsers);
router.put('/users/:userId/status', validate(validation.updateUserStatusSchema), controller.updateUserStatus);

router.get('/reports', validate(validation.queryPaginationSchema), controller.getReports);
router.put('/reports/:reportId/resolve', validate(validation.reportIdParamsSchema), controller.resolveReport);

router.delete('/posts/:postId', validate(validation.postIdParamsSchema), controller.deletePost);
router.get('/posts', controller.getPosts);

router.get('/featured', controller.getFeatured);
router.post('/featured', validate(validation.featurePostSchema), controller.addFeatured);
router.delete('/featured/:postId', validate(validation.postIdParamsSchema), controller.removeFeatured);

router.get('/config/auth-media', controller.getAuthMedia);
router.put('/config/auth-media', controller.updateAuthMedia);

router.post('/notifications/broadcast', controller.broadcastNotification);

router.get('/cms/:slug', controller.getCmsPage);
router.put('/cms/:slug', controller.updateCmsPage);

router.get('/community-interest', controller.getCommunityInterestUsers);

router.get('/global-popup', controller.getGlobalPopup);
router.put('/global-popup', controller.updateGlobalPopup);

export default router;