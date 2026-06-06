import { Router } from 'express';
import { authGuard } from '../../middlewares/authGuard.js';
import * as interactionController from './interaction.controller.js';

const router = Router();

// Route: POST /api/v1/interactions/posts/:postId/save
router.post(
  '/posts/:postId/save', 
  authGuard, 
  interactionController.toggleSave
);

export default router;