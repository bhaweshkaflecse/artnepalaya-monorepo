import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authGuard } from '../../middlewares/authGuard.js';
import { validate } from '../../middlewares/validator.js';
import * as validation from './report.validation.js';
import * as controller from './report.controller.js';

const router = Router();
const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 10,
  message: { success: false, error: { code: "RATE_LIMIT", message: "Too many reports." } }
});

router.post('/', authGuard, reportLimiter, validate(validation.createReportSchema), controller.submitReport);
export default router;