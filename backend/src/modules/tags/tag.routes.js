import { Router } from 'express';
import { authGuard } from '../../middlewares/authGuard.js';
import { validate } from '../../middlewares/validator.js';
import * as validation from './tag.validation.js';
import * as controller from './tag.controller.js';

const router = Router();
router.use(authGuard);
router.get('/', validate(validation.searchTagsSchema), controller.searchTags);
export default router;