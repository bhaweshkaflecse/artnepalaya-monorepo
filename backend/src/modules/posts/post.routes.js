import { Router } from 'express';
import { authGuard } from '../../middlewares/authGuard.js';
import { optionalAuth } from '../../middlewares/optionalAuth.js';
import { validate } from '../../middlewares/validator.js';
import { secureUpload, handleUploadErrors } from '../../middlewares/upload.js';
import * as validation from './post.validation.js';
import * as controller from './post.controller.js';

const router = Router();

// === Public Routes (no auth required) ===
router.get('/feed', optionalAuth, validate(validation.feedPaginationSchema), controller.getFeed);
router.get('/:postId', optionalAuth, controller.getSinglePost);

// Protect all routes below
router.use(authGuard);

// === Core Post Routes ===
// Note: secureUpload handles the files in memory BEFORE Zod validates the rest of the body!
router.post(
  '/', 
  secureUpload.array('media', 6), 
  handleUploadErrors, 
  validate(validation.createPostSchema), 
  controller.createPost
);

// === Edit / Delete ===
router.put('/:postId', validate(validation.updatePostSchema), controller.updatePost);
router.delete('/:postId', controller.deletePost);

// === Interactions ===
router.post('/:postId/likes', controller.likePost);
router.delete('/:postId/likes', controller.unlikePost);

router.post('/:postId/saves', controller.savePost);
router.delete('/:postId/saves', controller.unsavePost);

export default router;