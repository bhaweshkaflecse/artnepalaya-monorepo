import { Router } from 'express';
import { authGuard } from '../../middlewares/authGuard.js';
import { validate } from '../../middlewares/validator.js';
import { secureUpload, handleUploadErrors } from '../../middlewares/upload.js';
import * as validation from './post.validation.js';
import * as controller from './post.controller.js';

const router = Router();

// === Public Routes (no auth required) ===
router.get('/feed', validate(validation.feedPaginationSchema), controller.getFeed);

// Protect all routes below
router.use(authGuard);

// === Core Post Routes ===
// Note: secureUpload handles the files in memory BEFORE Zod validates the rest of the body!
router.post(
  '/', 
  secureUpload.array('media', 3), 
  handleUploadErrors, 
  validate(validation.createPostSchema), 
  controller.createPost
);

router.get('/:postId', controller.getSinglePost);

// === Interactions ===
router.post('/:postId/likes', controller.likePost);
router.delete('/:postId/likes', controller.unlikePost);

router.post('/:postId/saves', controller.savePost);
router.delete('/:postId/saves', controller.unsavePost);

export default router;