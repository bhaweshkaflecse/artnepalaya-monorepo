import { Router } from 'express';
import { authGuard } from '../../middlewares/authGuard.js';
import { validate } from '../../middlewares/validator.js';
import * as controller from './user.controller.js';
import * as validation from './user.validation.js';

const router = Router();

// === Personal Profile Routes (require auth) ===
router.get('/me', authGuard, controller.getMe);
router.put('/me', authGuard, validate(validation.updateProfileSchema), controller.updateMe);
router.get('/me/saved', authGuard, validate(validation.paginationSchema), controller.getSavedPosts);

// === Push Token Routes (require auth) ===
router.post('/me/push-token', authGuard, controller.registerPushToken);
router.delete('/me/push-token', authGuard, controller.removePushToken);

// === Public User Routes (no auth required) ===
// (Order matters! These must go AFTER '/me' so Express doesn't think "me" is a userId)
router.get('/:userId', controller.getPublicProfile);
router.get('/:userId/posts', validate(validation.paginationSchema), controller.getUserPosts);
router.get('/:userId/followers', controller.getFollowers);
router.get('/:userId/following', controller.getFollowing);

// === Follow Routes (require auth) ===
router.post('/:userId/follow', authGuard, controller.followUser);
router.delete('/:userId/follow', authGuard, controller.unfollowUser);

export default router;
