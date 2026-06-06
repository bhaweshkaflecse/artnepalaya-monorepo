import { Router } from 'express';
import { authGuard } from '../../middlewares/authGuard.js';
import * as controller from './community.controller.js';

const router = Router();

router.post('/waitlist', authGuard, controller.joinWaitlist);
router.get('/waitlist/count', controller.getWaitlistCount);

export default router;
