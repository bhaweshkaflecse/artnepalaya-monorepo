import express from 'express';
import { applySecurityMiddlewares } from './middlewares/security.js';
import { globalErrorHandler } from './middlewares/errorHandler.js';

// Route Imports
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/users/user.routes.js';
import postRoutes from './modules/posts/post.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import configRoutes from './modules/admin/config.routes.js';
// ... import other modules (tags, notifications, etc.) as needed
import notificationRoutes from './modules/notifications/notification.routes.js';
import communityRoutes from './modules/community/community.routes.js';

const app = express();

// Trust the first proxy (Nginx) so rate limiter sees real client IP
app.set('trust proxy', 1);

// 1. Apply Global Security Layer FIRST
// (Includes Helmet, CORS, MongoSanitize, XSS Sanitize, and Rate Limiting)
applySecurityMiddlewares(app);

// 2. Parse Body with strict limits to prevent memory exhaustion attacks
app.use(express.json({ limit: '50kb' })); 
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// 3. Health Check (Useful for monitoring/load balancers)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 4. Mount Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/posts', postRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/config', configRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/community', communityRoutes);

// 5. Global Error Handler (MUST BE DEFINED AFTER ROUTES)
app.use(globalErrorHandler);

export default app;