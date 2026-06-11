import { Router } from 'express';
import { authGuard } from '../../middlewares/authGuard.js';
import { requireRole } from '../../middlewares/roleGuard.js';
import { optionalAuth } from '../../middlewares/optionalAuth.js';
import * as controller from './community.controller.js';

const router = Router();

router.post('/waitlist', authGuard, controller.joinWaitlist);
router.get('/waitlist/count', controller.getWaitlistCount);

// Community Interest - no auth required (guests can register)
router.post('/interest', optionalAuth, controller.registerInterest);

// Admin only - get all interest users
router.get('/interest/users', authGuard, requireRole(['Admin']), controller.getInterestUsers);

export default router;
