import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../../middlewares/validator.js';
import { authGuard } from '../../middlewares/authGuard.js';
import * as validation from './auth.validation.js';
import * as controller from './auth.controller.js';

const router = Router();

const otpSendLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 3 });
const otpVerifyLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });

// PUBLIC
router.post('/google', validate(validation.googleAuthSchema), controller.googleLogin);
router.post('/refresh', validate(validation.refreshSchema), controller.refreshToken);
router.post('/admin-login', validate(validation.adminLoginSchema), controller.adminLogin);

// PROTECTED (Requires Google Login first)
router.post('/otp/send', authGuard, otpSendLimiter, validate(validation.sendOtpSchema), controller.sendOtp);
router.post('/otp/verify', authGuard, otpVerifyLimiter, validate(validation.verifyOtpSchema), controller.verifyPhone);
router.post('/logout', authGuard, validate(validation.logoutSchema), controller.logout);

export default router;