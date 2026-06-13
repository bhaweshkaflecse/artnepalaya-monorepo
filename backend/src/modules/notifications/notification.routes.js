import { Router } from 'express';
import { authGuard } from '../../middlewares/authGuard.js';
import { validate } from '../../middlewares/validator.js';
import * as validation from './notification.validation.js';
import * as controller from './notification.controller.js';

const router = Router();
router.use(authGuard);
router.get('/', validate(validation.paginationSchema), controller.getNotifications);
router.put('/read', controller.markAsRead);
router.put('/:notificationId/read', controller.markOneAsRead);
export default router;