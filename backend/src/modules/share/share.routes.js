import { Router } from 'express';
import mongoose from 'mongoose';
import { Post } from '../posts/post.model.js';

const router = Router();

// Relaxed CSP for public share landing pages.
// These pages render Cloudinary images, Google avatars, and inline deep-link scripts.
// API endpoints retain strict defaults from Helmet.
const SHARE_PAGE_IMG_SRC = (process.env.CSP_IMG_SRC || "'self' data: blob: https: https://res.cloudinary.com https://lh3.googleusercontent.com").trim();
const SHARE_PAGE_CSP = [
  "default-src 'self'",
  `img-src ${SHARE_PAGE_IMG_SRC}`,
  "media-src 'self' https: https://res.cloudinary.com",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
].join('; ');

router.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', SHARE_PAGE_CSP);
  next();
});

/**
 * GET /p/:postId
 * Share landing page for posts/artworks.
 * Serves HTML with Open Graph meta tags for rich link previews,
 * a beautiful dark-themed landing page, and deep link redirect attempt.
 */
router.get('/p/:postId', async (req, res) => {
  try {
    const { postId } = req.params;

    // Validate ObjectId format to prevent Mongoose CastError / stack trace leaks
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(404).send(buildGenericPage(
        'Artwork Not Found',
        'This artwork may have been removed or is no longer available.',
        null
      ));
    }

    const post = await Post.findById(postId)
      .populate('authorId', 'username avatarUrl fullName')
      .lean();

    if (!post) {
      return res.status(404).send(buildGenericPage(
        'Artwork Not Found',
        'This artwork may have been removed or is no longer available.',
        null
      ));
    }

    const authorName = post.authorId?.username || 'Artist';
    const authorFullName = post.authorId?.fullName || authorName;
    const caption = post.caption || '';
    const artworkTypes = Array.isArray(post.artworkType) ? post.artworkType : [];
    const ogTitle = caption
      ? `${caption.substring(0, 60)}${caption.length > 60 ? '...' : ''} - by ${authorFullName}`
      : `Artwork by ${authorFullName}`;
    const ogDescription = caption
      ? `${caption.substring(0, 200)}${caption.length > 200 ? '...' : ''}`
      : `Check out this artwork by ${authorFullName} on Art Nepalaya`;

    // Media type detection
    const mediaItems = Array.isArray(post.media) ? post.media : [];
    const mediaCount = mediaItems.length;
    const firstMedia = mediaCount > 0 ? mediaItems[0] : null;
    const firstMediaType = firstMedia?.type || 'image'; // default to 'image' for old posts without type
    const firstMediaUrl = firstMedia?.url || '';
    const isVideo = firstMediaType === 'video';
    const isGallery = mediaCount > 1;

    // For video posts, generate a poster/thumbnail URL from Cloudinary.
    // Strategy: replace video extension with .jpg or insert /so_0/ transform.
    // This handles both old and new Cloudinary URL formats safely.
    const videoPosterUrl = isVideo ? getVideoThumbnailUrl(firstMediaUrl) : '';

    // og:image - for video posts use the poster thumbnail, for image posts use the raw URL.
    // Do not add optimization transforms to raw URLs because old Cloudinary URLs
    // may already have transforms embedded, and double-stacking produces invalid URLs.
    const ogImage = isVideo ? videoPosterUrl : firstMediaUrl;
    const ogUrl = `https://app.artnepalaya.com/p/${postId}`;
    const deepLink = `artnepalaya://p/${postId}`;
    const playStoreUrl = `https://play.google.com/store/apps/details?id=com.artnepalaya.mobile&referrer=utm_source%3Dshare%26utm_content%3D${postId}`;
    const likesCount = post.likesCount || 0;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(ogTitle)}</title>

  <!-- Open Graph Meta Tags -->
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(ogTitle)}">
  <meta property="og:description" content="${escapeHtml(ogDescription)}">
  <meta property="og:image" content="${escapeHtml(ogImage)}">
  <meta property="og:url" content="${escapeHtml(ogUrl)}">
  <meta property="og:site_name" content="Art Nepalaya">
  ${isVideo ? `<meta property="og:video" content="${escapeHtml(firstMediaUrl)}">
  <meta property="og:video:type" content="video/mp4">
  <meta property="og:video:width" content="720">
  <meta property="og:video:height" content="900">` : ''}

  <!-- Twitter Card -->
  ${isVideo ? `<meta name="twitter:card" content="player">
  <meta name="twitter:title" content="${escapeHtml(ogTitle)}">
  <meta name="twitter:description" content="${escapeHtml(ogDescription)}">
  <meta name="twitter:image" content="${escapeHtml(ogImage)}">
  <meta name="twitter:player" content="${escapeHtml(firstMediaUrl)}">
  <meta name="twitter:player:width" content="720">
  <meta name="twitter:player:height" content="900">` : `<meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(ogTitle)}">
  <meta name="twitter:description" content="${escapeHtml(ogDescription)}">
  <meta name="twitter:image" content="${escapeHtml(ogImage)}">`}

  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0A0A0A;
      color: #FFFFFF;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .container {
      max-width: 480px;
      width: 100%;
      padding: 24px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .logo {
      font-size: 24px;
      font-weight: 700;
      color: #FF3B30;
      margin-bottom: 24px;
      letter-spacing: -0.5px;
    }
    .artwork-preview {
      width: 100%;
      aspect-ratio: 4/5;
      border-radius: 12px;
      overflow: hidden;
      background: #1A1A1A;
      margin-bottom: 16px;
      position: relative;
    }
    .artwork-preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .artwork-preview video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      background: #000;
    }
    .gallery-badge {
      position: absolute;
      top: 12px;
      right: 12px;
      background: rgba(0, 0, 0, 0.7);
      color: #FFFFFF;
      font-size: 12px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 12px;
      backdrop-filter: blur(4px);
      z-index: 2;
    }
    .artwork-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #666;
      font-size: 48px;
    }
    .author-row {
      display: flex;
      align-items: center;
      width: 100%;
      margin-bottom: 12px;
      gap: 12px;
    }
    .author-avatar {
      width: 40px;
      height: 40px;
      border-radius: 20px;
      background: #1A1A1A;
      overflow: hidden;
      flex-shrink: 0;
    }
    .author-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .author-info {
      flex: 1;
    }
    .author-fullname {
      font-size: 16px;
      font-weight: 600;
      color: #FFFFFF;
    }
    .author-username {
      font-size: 13px;
      color: #9CA3AF;
    }
    .likes-count {
      font-size: 13px;
      color: #9CA3AF;
      margin-top: 2px;
    }
    .artwork-types {
      width: 100%;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;
    }
    .artwork-type-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 500;
      background: #1A1A2E;
      color: #A78BFA;
      border: 1px solid #2D2D44;
    }
    .caption {
      width: 100%;
      font-size: 15px;
      line-height: 1.6;
      color: #E5E5E5;
      margin-bottom: 24px;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .cta-section {
      width: 100%;
      text-align: center;
      padding: 24px 0;
      border-top: 1px solid #1A1A1A;
    }
    .cta-title {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .cta-subtitle {
      font-size: 14px;
      color: #9CA3AF;
      margin-bottom: 20px;
    }
    .store-buttons {
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: center;
    }
    .store-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 14px 32px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      text-decoration: none;
      color: #FFFFFF;
      width: 100%;
      max-width: 280px;
      transition: opacity 0.2s;
    }
    .store-btn:hover { opacity: 0.85; }
    .store-btn-play { background: #1DB954; }
    .store-btn-apple { background: #333333; }
    .store-btn-disabled {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }
    .open-app-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 14px 32px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      text-decoration: none;
      color: #FFFFFF;
      background: #FF3B30;
      width: 100%;
      max-width: 280px;
      margin-bottom: 12px;
      transition: opacity 0.2s;
    }
    .open-app-btn:hover { opacity: 0.85; }
    .platform-ios-note {
      font-size: 13px;
      color: #9CA3AF;
      margin-top: 8px;
      font-style: italic;
    }
    .platform-section { display: none; }
    .platform-section.active { display: block; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">Art Nepalaya</div>

    <div class="artwork-preview">
      ${isGallery ? `<span class="gallery-badge">1 / ${mediaCount}</span>` : ''}
      ${firstMediaUrl
        ? (isVideo
          ? `<video src="${escapeHtml(firstMediaUrl)}" poster="${escapeHtml(videoPosterUrl)}" muted playsinline preload="metadata" controls></video>`
          : `<img src="${escapeHtml(firstMediaUrl)}" alt="Artwork by ${escapeHtml(authorName)}">`)
        : '<div class="artwork-placeholder">&#x1F3A8;</div>'}
    </div>

    <div class="author-row">
      <div class="author-avatar">
        ${post.authorId?.avatarUrl
          ? `<img src="${escapeHtml(post.authorId.avatarUrl)}" alt="${escapeHtml(authorFullName)}">`
          : ''}
      </div>
      <div class="author-info">
        <div class="author-fullname">${escapeHtml(authorFullName)}</div>
        <div class="author-username">@${escapeHtml(authorName)}</div>
        <div class="likes-count">${likesCount} ${likesCount === 1 ? 'like' : 'likes'}</div>
      </div>
    </div>

    ${artworkTypes.length > 0 ? `<div class="artwork-types">${artworkTypes.map(type => `<span class="artwork-type-badge">${escapeHtml(type)}</span>`).join('')}</div>` : ''}

    ${caption ? `<div class="caption">${escapeHtml(caption)}</div>` : ''}

    <div class="cta-section">
      <div class="cta-title">View in Art Nepalaya</div>
      <div class="cta-subtitle">Discover and share artwork from Nepali artists</div>

      <!-- Android CTA -->
      <div class="store-buttons platform-section" id="cta-android">
        <a href="${escapeHtml(deepLink)}" class="open-app-btn">Open in App</a>
        <a href="${escapeHtml(playStoreUrl)}" class="store-btn store-btn-play">Get on Google Play</a>
      </div>

      <!-- iOS CTA -->
      <div class="store-buttons platform-section" id="cta-ios">
        <a href="${escapeHtml(deepLink)}" class="open-app-btn">Open in App</a>
        <span class="store-btn store-btn-apple store-btn-disabled">Coming Soon to App Store</span>
        <p class="platform-ios-note">Art Nepalaya for iOS is coming soon!</p>
      </div>

      <!-- Desktop CTA -->
      <div class="store-buttons platform-section" id="cta-desktop">
        <a href="${escapeHtml(playStoreUrl)}" class="store-btn store-btn-play">Get on Google Play</a>
        <span class="store-btn store-btn-apple store-btn-disabled">Coming Soon to App Store</span>
      </div>
    </div>
  </div>

  <script>
    // Platform detection and smart deep link handling.
    // Android: attempt deep link, auto-redirect to Play Store if app not installed.
    // iOS: attempt deep link, show Coming Soon note (App Store link ready for future).
    // Desktop: show both store buttons, no auto-redirect.
    (function() {
      var deepLink = ${JSON.stringify(deepLink)};
      var playStoreUrl = ${JSON.stringify(playStoreUrl)};
      var ua = navigator.userAgent || '';
      var isAndroid = /android/i.test(ua);
      var isIOS = /iphone|ipad|ipod/i.test(ua);
      var isDesktop = !isAndroid && !isIOS;

      // Show the correct CTA section
      var sectionId = isAndroid ? 'cta-android' : (isIOS ? 'cta-ios' : 'cta-desktop');
      var section = document.getElementById(sectionId);
      if (section) section.classList.add('active');

      // On mobile platforms, attempt to open the app via custom scheme
      if (isAndroid || isIOS) {
        var iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = deepLink;
        document.body.appendChild(iframe);

        if (isAndroid) {
          // On Android, redirect to Play Store if the app did not intercept
          var timeout = setTimeout(function() {
            document.body.removeChild(iframe);
            window.location.href = playStoreUrl;
          }, 1500);

          // If the page loses visibility (app opened), cancel the fallback
          document.addEventListener('visibilitychange', function() {
            if (document.hidden) {
              clearTimeout(timeout);
            }
          });
        } else {
          // iOS: just clean up the iframe; no auto-redirect (app not on App Store yet)
          setTimeout(function() { document.body.removeChild(iframe); }, 2000);
        }
      }
    })();
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (error) {
    console.error('[Share] Error rendering post landing page:', error);
    return res.status(500).send(buildGenericPage(
      'Something went wrong',
      'Please try again later.',
      null
    ));
  }
});

/**
 * GET /u/:username
 * Share landing page for user profiles.
 */
router.get('/u/:username', async (req, res) => {
  const { username } = req.params;
  const deepLink = `artnepalaya://u/${username}`;
  const ogUrl = `https://app.artnepalaya.com/u/${username}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(username)} on Art Nepalaya</title>

  <meta property="og:type" content="profile">
  <meta property="og:title" content="${escapeHtml(username)} on Art Nepalaya">
  <meta property="og:description" content="View ${escapeHtml(username)}'s artwork and profile on Art Nepalaya">
  <meta property="og:url" content="${escapeHtml(ogUrl)}">
  <meta property="og:site_name" content="Art Nepalaya">

  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(username)} on Art Nepalaya">
  <meta name="twitter:description" content="View ${escapeHtml(username)}'s artwork and profile on Art Nepalaya">

  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0A0A0A;
      color: #FFFFFF;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .container {
      max-width: 480px;
      width: 100%;
      padding: 48px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .logo {
      font-size: 24px;
      font-weight: 700;
      color: #FF3B30;
      margin-bottom: 32px;
    }
    .profile-icon {
      width: 80px;
      height: 80px;
      border-radius: 40px;
      background: #1A1A1A;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 36px;
      margin-bottom: 16px;
    }
    .username {
      font-size: 22px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .subtitle {
      font-size: 14px;
      color: #9CA3AF;
      margin-bottom: 32px;
    }
    .store-buttons {
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: center;
      width: 100%;
    }
    .open-app-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 14px 32px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      text-decoration: none;
      color: #FFFFFF;
      background: #FF3B30;
      width: 100%;
      max-width: 280px;
      transition: opacity 0.2s;
    }
    .open-app-btn:hover { opacity: 0.85; }
    .store-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 14px 32px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      text-decoration: none;
      color: #FFFFFF;
      width: 100%;
      max-width: 280px;
      transition: opacity 0.2s;
    }
    .store-btn:hover { opacity: 0.85; }
    .store-btn-play { background: #1DB954; }
    .store-btn-apple { background: #333333; }
    .store-btn-disabled {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">Art Nepalaya</div>
    <div class="profile-icon">&#x1F3A8;</div>
    <div class="username">@${escapeHtml(username)}</div>
    <div class="subtitle">View this artist's profile and artwork on Art Nepalaya</div>

    <div class="store-buttons">
      <a href="${escapeHtml(deepLink)}" class="open-app-btn">Open in App</a>
      <a href="https://play.google.com/store/apps/details?id=com.artnepalaya.mobile" class="store-btn store-btn-play">Get on Google Play</a>
      <span class="store-btn store-btn-apple store-btn-disabled">Coming Soon to iOS</span>
    </div>
  </div>

  <script>
    (function() {
      var deepLink = ${JSON.stringify(deepLink)};
      var iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = deepLink;
      document.body.appendChild(iframe);
      setTimeout(function() { document.body.removeChild(iframe); }, 2000);
    })();
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(html);
});

/**
 * GET /c/:id - Community landing page (placeholder)
 */
router.get('/c/:id', (req, res) => {
  const { id } = req.params;
  const deepLink = `artnepalaya://c/${id}`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(buildGenericPage(
    'Community on Art Nepalaya',
    'Open in the Art Nepalaya app to view this community.',
    deepLink
  ));
});

/**
 * GET /e/:id - Event landing page (placeholder)
 */
router.get('/e/:id', (req, res) => {
  const { id } = req.params;
  const deepLink = `artnepalaya://e/${id}`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(buildGenericPage(
    'Event on Art Nepalaya',
    'Open in the Art Nepalaya app to view this event.',
    deepLink
  ));
});

/**
 * GET /m/:id - Marketplace landing page (placeholder)
 */
router.get('/m/:id', (req, res) => {
  const { id } = req.params;
  const deepLink = `artnepalaya://m/${id}`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(buildGenericPage(
    'Marketplace Item on Art Nepalaya',
    'Open in the Art Nepalaya app to view this item.',
    deepLink
  ));
});

/**
 * Build a generic "Open in Art Nepalaya" landing page.
 */
function buildGenericPage(title, description, deepLink) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:site_name" content="Art Nepalaya">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0A0A0A;
      color: #FFFFFF;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .container {
      max-width: 480px;
      width: 100%;
      padding: 48px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .logo {
      font-size: 24px;
      font-weight: 700;
      color: #FF3B30;
      margin-bottom: 32px;
    }
    .title {
      font-size: 22px;
      font-weight: 600;
      margin-bottom: 12px;
    }
    .description {
      font-size: 14px;
      color: #9CA3AF;
      margin-bottom: 32px;
      line-height: 1.5;
    }
    .store-buttons {
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: center;
      width: 100%;
    }
    .open-app-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 14px 32px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      text-decoration: none;
      color: #FFFFFF;
      background: #FF3B30;
      width: 100%;
      max-width: 280px;
      transition: opacity 0.2s;
    }
    .open-app-btn:hover { opacity: 0.85; }
    .store-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 14px 32px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      text-decoration: none;
      color: #FFFFFF;
      width: 100%;
      max-width: 280px;
      transition: opacity 0.2s;
    }
    .store-btn:hover { opacity: 0.85; }
    .store-btn-play { background: #1DB954; }
    .store-btn-apple { background: #333333; }
    .store-btn-disabled {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">Art Nepalaya</div>
    <div class="title">${escapeHtml(title)}</div>
    <div class="description">${escapeHtml(description)}</div>

    <div class="store-buttons">
      ${deepLink ? `<a href="${escapeHtml(deepLink)}" class="open-app-btn">Open in App</a>` : ''}
      <a href="https://play.google.com/store/apps/details?id=com.artnepalaya.mobile" class="store-btn store-btn-play">Get on Google Play</a>
      <span class="store-btn store-btn-apple store-btn-disabled">Coming Soon to iOS</span>
    </div>
  </div>

  ${deepLink ? `<script>
    (function() {
      var deepLink = ${JSON.stringify(deepLink)};
      var iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = deepLink;
      document.body.appendChild(iframe);
      setTimeout(function() { document.body.removeChild(iframe); }, 2000);
    })();
  </script>` : ''}
</body>
</html>`;
}

/**
 * Generate a poster/thumbnail URL for a Cloudinary video.
 * Handles multiple URL patterns:
 * - Standard Cloudinary video: .../video/upload/v123/file.mp4 -> .../video/upload/so_0/v123/file.jpg
 * - Already-transformed URLs: insert so_0 after existing transforms
 * - Non-Cloudinary URLs: append .jpg extension as fallback
 *
 * The /so_0/ transform tells Cloudinary to extract the first frame (second offset 0).
 * Changing the extension from .mp4 to .jpg returns it as an image.
 */
function getVideoThumbnailUrl(videoUrl) {
  if (!videoUrl) return '';

  // Cloudinary URL pattern: https://res.cloudinary.com/{cloud}/video/upload/{transforms}/v{version}/{path}.{ext}
  const cloudinaryVideoRegex = /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/video\/upload\/)(.*?)(\.[^.]+)$/;
  const match = videoUrl.match(cloudinaryVideoRegex);

  if (match) {
    // Insert so_0 transform and change extension to .jpg
    const base = match[1]; // up to /upload/
    const pathPart = match[2]; // everything between /upload/ and the final extension
    // Insert so_0 at the start of the path (after /upload/)
    return `${base}so_0/${pathPart}.jpg`;
  }

  // Fallback for non-Cloudinary video URLs: just replace the extension with .jpg
  const lastDotIndex = videoUrl.lastIndexOf('.');
  if (lastDotIndex > 0) {
    return videoUrl.substring(0, lastDotIndex) + '.jpg';
  }

  return videoUrl;
}

/**
 * Escape HTML special characters to prevent XSS.
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default router;
