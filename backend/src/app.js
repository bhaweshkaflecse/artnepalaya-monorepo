import express from 'express';
import { applySecurityMiddlewares } from './middlewares/security.js';
import { globalErrorHandler } from './middlewares/errorHandler.js';

// Route Imports
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/users/user.routes.js';
import postRoutes from './modules/posts/post.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import configRoutes from './modules/admin/config.routes.js';
import reportRoutes from './modules/reports/report.routes.js';
import tagRoutes from './modules/tags/tag.routes.js';
// ... import other modules (tags, notifications, etc.) as needed
import notificationRoutes from './modules/notifications/notification.routes.js';
import communityRoutes from './modules/community/community.routes.js';
import shareRoutes from './modules/share/share.routes.js';

const app = express();

// Temporary request logging for debugging nginx routing
app.use((req, res, next) => {
  console.log('[REQUEST]', req.method, req.originalUrl);
  next();
});

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

// 4. Android App Links - Digital Asset Links verification
//
// This endpoint enables Android App Links (verified deep links) so that
// https://app.artnepalaya.com/p/{id} and /u/{id} URLs open directly in the
// app without a disambiguation dialog.
//
// REQUIREMENTS FOR PRODUCTION:
// 1. This must be served at https://app.artnepalaya.com/.well-known/assetlinks.json
//    (the domain in AndroidManifest.xml intent-filter android:host).
// 2. Must return Content-Type: application/json
// 3. Must be accessible without redirects (no 301/302)
// 4. Must be served over HTTPS
//
// HOW TO GET THE SHA256 FINGERPRINT:
// -----------------------------------------------------------------
// Option A: From your local keystore (debug or release):
//   keytool -list -v -keystore <path-to-keystore> -alias <alias-name>
//   Example (debug): keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey
//   Example (release): keytool -list -v -keystore release.keystore -alias artnepalaya
//   Password for debug keystore is "android"
//
// Option B: From Google Play App Signing (RECOMMENDED for production):
//   1. Go to Google Play Console > App > Setup > App signing
//   2. Copy the "SHA-256 certificate fingerprint" under "App signing key certificate"
//   3. This is the fingerprint Google uses to sign your production APK/AAB
//
// Option C: Using Expo EAS credentials:
//   eas credentials -p android
//   This shows the keystore info including SHA-256 fingerprint
//
// IMPORTANT: If you use Google Play App Signing (default for new apps), you
// MUST use the fingerprint from the Play Console (Option B), NOT your local
// upload keystore. Google re-signs your app with their key.
//
// You can include BOTH fingerprints (upload + app signing) during development:
//   sha256_cert_fingerprints: ['<play-signing-key>', '<upload-key>']
//
// VERIFICATION:
//   After deploying, verify with:
//   https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://app.artnepalaya.com&relation=delegate_permission/common.handle_all_urls
// -----------------------------------------------------------------
app.get('/.well-known/assetlinks.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  // Cache for 1 hour - Android checks this periodically
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.status(200).json([
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'com.artnepalaya.mobile',
        sha256_cert_fingerprints: [
          // TODO: Replace with actual SHA-256 fingerprint(s) from Google Play Console
          // (Setup > App signing > App signing key certificate > SHA-256 fingerprint)
          // Format: 'XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX'
          'TODO:ADD_SHA256_FROM_PLAY_CONSOLE_APP_SIGNING_KEY'
        ]
      }
    }
  ]);
});

// 5. Share Landing Pages (mounted at root level for public-facing URLs)
app.use('/', shareRoutes);

// 6. Mount API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/posts', postRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/config', configRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/tags', tagRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/community', communityRoutes);

// 7. Global Error Handler (MUST BE DEFINED AFTER ROUTES)
app.use(globalErrorHandler);

export default app;