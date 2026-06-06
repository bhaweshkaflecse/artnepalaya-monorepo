import { Router } from 'express';
import { authGuard } from '../../middlewares/authGuard.js';
import { validate } from '../../middlewares/validator.js';
import * as controller from './user.controller.js';
import * as validation from './user.validation.js';

const router = Router();

// Protect all user routes (you must be logged in to view profiles or posts)
router.use(authGuard);

// === Personal Profile Routes ===
router.get('/me', controller.getMe);
router.put('/me', validate(validation.updateProfileSchema), controller.updateMe);

// === Push Token Routes ===
router.post('/me/push-token', controller.registerPushToken);
router.delete('/me/push-token', controller.removePushToken);

// === Public/Other User Routes ===
// (Order matters! These must go AFTER '/me' so Express doesn't think "me" is a userId)
router.get('/:userId', controller.getPublicProfile);
router.get('/:userId/posts', validate(validation.paginationSchema), controller.getUserPosts);

export default router;