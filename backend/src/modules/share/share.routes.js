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
    const intentUri = `intent://p/${postId}#Intent;scheme=artnepalaya;package=com.artnepalaya.mobile;end`;
    const playStoreUrl = `https://play.google.com/store/apps/details?id=com.artnepalaya.mobile&referrer=utm_source%3Dshare%26utm_content%3D${postId}`;
    const likesCount = post.likesCount || 0;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
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
  <!-- Always use summary_large_image for all posts (including video).
       twitter:player requires a dedicated embeddable HTML player page URL,
       not a raw .mp4 file. Since we don't have a player embed endpoint,
       we use the poster/thumbnail as twitter:image for video posts. -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(ogTitle)}">
  <meta name="twitter:description" content="${escapeHtml(ogDescription)}">
  <meta name="twitter:image" content="${escapeHtml(ogImage)}">

  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      max-width: 100vw;
      overflow-x: hidden;
      -webkit-text-size-adjust: 100%;
      -moz-text-size-adjust: 100%;
      text-size-adjust: 100%;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0A0A0A;
      color: #FFFFFF;
      min-height: 100vh;
      min-height: -webkit-fill-available;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding-bottom: 80px; /* space for sticky CTA */
    }
    .container {
      max-width: 480px;
      width: 100%;
      padding: 16px 16px 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    /* Header / Logo */
    .logo {
      font-size: 20px;
      font-weight: 700;
      color: #FF3B30;
      margin-bottom: 16px;
      letter-spacing: -0.5px;
    }
    /* Artwork Preview - constrained for mobile */
    .artwork-preview {
      width: 100%;
      max-height: 45vh;
      border-radius: 12px;
      overflow: hidden;
      background: #1A1A1A;
      margin-bottom: 14px;
      position: relative;
    }
    .artwork-preview img {
      width: 100%;
      height: 100%;
      max-height: 45vh;
      object-fit: cover;
      display: block;
    }
    .artwork-preview video {
      width: 100%;
      height: 100%;
      max-height: 45vh;
      object-fit: cover;
      background: #000;
      display: block;
    }
    /* Gallery */
    .gallery-container {
      width: 100%;
      max-height: 50vh;
      border-radius: 12px;
      overflow: hidden;
      background: #1A1A1A;
      margin-bottom: 14px;
      position: relative;
    }
    .gallery-scroll {
      display: flex;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      -ms-overflow-style: none;
      max-height: 45vh;
    }
    .gallery-scroll::-webkit-scrollbar {
      display: none;
    }
    .gallery-item {
      min-width: 100%;
      max-height: 45vh;
      scroll-snap-align: start;
      flex-shrink: 0;
    }
    .gallery-item img {
      width: 100%;
      height: 100%;
      max-height: 45vh;
      object-fit: cover;
      display: block;
    }
    .gallery-item video {
      width: 100%;
      height: 100%;
      max-height: 45vh;
      object-fit: cover;
      background: #000;
      display: block;
    }
    .gallery-badge {
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.65);
      color: #FFFFFF;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 9px;
      border-radius: 10px;
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      z-index: 2;
    }
    .gallery-dots {
      display: flex;
      justify-content: center;
      gap: 5px;
      padding: 8px 0;
    }
    .gallery-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #444;
      transition: background 0.3s;
    }
    .gallery-dot.active {
      background: #FF3B30;
    }
    .artwork-placeholder {
      width: 100%;
      height: 200px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #666;
      font-size: 48px;
    }
    /* Author Row */
    .author-row {
      display: flex;
      align-items: center;
      width: 100%;
      margin-bottom: 10px;
      gap: 10px;
    }
    .author-avatar {
      width: 38px;
      height: 38px;
      border-radius: 19px;
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
      min-width: 0;
    }
    .author-fullname {
      font-size: 15px;
      font-weight: 600;
      color: #FFFFFF;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .author-username {
      font-size: 12px;
      color: #9CA3AF;
    }
    .likes-count {
      font-size: 12px;
      color: #9CA3AF;
      margin-top: 1px;
    }
    /* Artwork Type Badges */
    .artwork-types {
      width: 100%;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 10px;
    }
    .artwork-type-badge {
      display: inline-block;
      padding: 3px 9px;
      border-radius: 14px;
      font-size: 11px;
      font-weight: 500;
      background: rgba(167, 139, 250, 0.1);
      color: #A78BFA;
      border: 1px solid rgba(167, 139, 250, 0.25);
    }
    /* Caption */
    .caption {
      width: 100%;
      font-size: 14px;
      line-height: 1.5;
      color: #E5E5E5;
      margin-bottom: 20px;
      white-space: pre-wrap;
      word-break: break-word;
      display: -webkit-box;
      -webkit-line-clamp: 4;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    /* Inline CTA Section (above fold) */
    .cta-section {
      width: 100%;
      text-align: center;
      padding: 20px 0;
      border-top: 1px solid rgba(255,255,255,0.06);
    }
    .cta-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 6px;
      background: linear-gradient(135deg, #FFFFFF, #D1D5DB);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .cta-subtitle {
      font-size: 13px;
      color: #9CA3AF;
      margin-bottom: 16px;
    }
    .store-buttons {
      display: flex;
      flex-direction: column;
      gap: 10px;
      align-items: center;
    }
    .store-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 12px 24px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      color: #FFFFFF;
      width: 100%;
      max-width: 260px;
      transition: transform 0.2s, opacity 0.2s;
    }
    .store-btn:hover { opacity: 0.9; transform: scale(1.02); }
    .store-btn-play { background: linear-gradient(135deg, #1DB954, #17a347); }
    .store-btn-apple { background: linear-gradient(135deg, #444, #2a2a2a); }
    .store-btn-disabled {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }
    .open-app-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 12px 24px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      color: #FFFFFF;
      background: linear-gradient(135deg, #FF3B30, #FF6B5A);
      width: 100%;
      max-width: 260px;
      margin-bottom: 6px;
      transition: transform 0.2s, opacity 0.2s;
      box-shadow: 0 4px 14px rgba(255, 59, 48, 0.3);
    }
    .open-app-btn:hover { opacity: 0.9; transform: scale(1.02); }
    .platform-ios-note {
      font-size: 12px;
      color: #9CA3AF;
      margin-top: 6px;
      font-style: italic;
    }
    .platform-section { display: none; }
    .platform-section.active { display: block; }
    /* Sticky bottom CTA bar - mobile only */
    .sticky-cta {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 100;
      background: rgba(10, 10, 10, 0.92);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding: 12px 16px;
      padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }
    .sticky-cta .sticky-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 12px 20px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      color: #FFFFFF;
      background: linear-gradient(135deg, #FF3B30, #FF6B5A);
      box-shadow: 0 4px 14px rgba(255, 59, 48, 0.35);
      flex: 1;
      max-width: 200px;
      transition: transform 0.2s;
    }
    .sticky-cta .sticky-btn:hover { transform: scale(1.02); }
    .sticky-cta .sticky-label {
      font-size: 13px;
      font-weight: 500;
      color: #D1D5DB;
    }
    /* Tablet breakpoint */
    @media (min-width: 768px) {
      body { padding-bottom: 0; }
      .container { max-width: 560px; padding: 32px 24px; }
      .logo { font-size: 22px; margin-bottom: 20px; }
      .artwork-preview { max-height: 55vh; border-radius: 16px; }
      .artwork-preview img, .artwork-preview video { max-height: 55vh; }
      .gallery-container { max-height: 55vh; border-radius: 16px; }
      .gallery-scroll { max-height: 55vh; }
      .gallery-item { max-height: 55vh; }
      .gallery-item img, .gallery-item video { max-height: 55vh; }
      .author-fullname { font-size: 17px; }
      .caption { font-size: 15px; -webkit-line-clamp: 6; }
      .cta-title { font-size: 20px; }
      .sticky-cta { display: none; }
    }
    /* Desktop breakpoint */
    @media (min-width: 1024px) {
      .container { max-width: 640px; padding: 40px 32px; }
      .logo { font-size: 24px; margin-bottom: 24px; }
      .artwork-preview { max-height: 60vh; border-radius: 16px; }
      .artwork-preview img, .artwork-preview video { max-height: 60vh; }
      .gallery-container { max-height: 60vh; border-radius: 16px; }
      .gallery-scroll { max-height: 60vh; }
      .gallery-item { max-height: 60vh; }
      .gallery-item img, .gallery-item video { max-height: 60vh; }
      .author-avatar { width: 44px; height: 44px; border-radius: 22px; }
      .author-fullname { font-size: 18px; }
      .caption { font-size: 16px; -webkit-line-clamp: 8; }
      .store-btn, .open-app-btn { max-width: 300px; padding: 14px 28px; font-size: 15px; }
      .sticky-cta { display: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">Art Nepalaya</div>

    ${isGallery ? `
    <div class="gallery-container">
      <span class="gallery-badge"><span id="gallery-current">1</span> / ${mediaCount}</span>
      <div class="gallery-scroll" id="gallery-scroll">
        ${mediaItems.map((item, index) => {
          const itemUrl = item.url || '';
          const itemType = item.type || 'image';
          if (itemType === 'video') {
            const posterUrl = getVideoThumbnailUrl(itemUrl);
            return `<div class="gallery-item"><video src="${escapeHtml(itemUrl)}" poster="${escapeHtml(posterUrl)}" muted playsinline preload="metadata" controls></video></div>`;
          }
          return `<div class="gallery-item"><img src="${escapeHtml(itemUrl)}" alt="Artwork ${index + 1} by ${escapeHtml(authorName)}"></div>`;
        }).join('')}
      </div>
      <div class="gallery-dots">
        ${mediaItems.map((_, index) => `<span class="gallery-dot${index === 0 ? ' active' : ''}" data-index="${index}"></span>`).join('')}
      </div>
    </div>
    ` : `
    <div class="artwork-preview">
      ${firstMediaUrl
        ? (isVideo
          ? `<video src="${escapeHtml(firstMediaUrl)}" poster="${escapeHtml(videoPosterUrl)}" muted playsinline preload="metadata" controls></video>`
          : `<img src="${escapeHtml(firstMediaUrl)}" alt="Artwork by ${escapeHtml(authorName)}">`)
        : '<div class="artwork-placeholder">&#x1F3A8;</div>'}
    </div>
    `}

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
        <a href="${escapeHtml(intentUri)}" class="open-app-btn">Open in App</a>
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

  <!-- Sticky bottom CTA bar for mobile -->
  <div class="sticky-cta" id="sticky-cta">
    <span class="sticky-label">Art Nepalaya</span>
    <a href="#" class="sticky-btn" id="sticky-open-btn">Open in App</a>
  </div>

  <script>
    // Platform detection and smart deep link handling.
    // Android: use intent:// URI which triggers the Android intent system directly.
    //          If app is installed, it opens. If not, falls back to Play Store.
    // iOS: attempt deep link via iframe, show Coming Soon note (App Store link ready for future).
    // Desktop: show both store buttons, no auto-redirect.
    (function() {
      var deepLink = ${JSON.stringify(deepLink)};
      var intentUri = ${JSON.stringify(intentUri)};
      var playStoreUrl = ${JSON.stringify(playStoreUrl)};
      var ua = navigator.userAgent || '';
      var isAndroid = /android/i.test(ua);
      var isIOS = /iphone|ipad|ipod/i.test(ua);
      var isDesktop = !isAndroid && !isIOS;

      // Show the correct CTA section
      var sectionId = isAndroid ? 'cta-android' : (isIOS ? 'cta-ios' : 'cta-desktop');
      var section = document.getElementById(sectionId);
      if (section) section.classList.add('active');

      // Configure sticky CTA button
      var stickyBtn = document.getElementById('sticky-open-btn');
      if (stickyBtn) {
        if (isAndroid) {
          stickyBtn.href = intentUri;
        } else if (isIOS) {
          stickyBtn.href = deepLink;
        } else {
          stickyBtn.href = playStoreUrl;
          stickyBtn.textContent = 'Get the App';
        }
      }

      // Hide sticky bar on desktop/tablet
      if (isDesktop) {
        var stickyBar = document.getElementById('sticky-cta');
        if (stickyBar) stickyBar.style.display = 'none';
      }

      if (isAndroid) {
        // Use intent:// URI which handles app-installed vs not-installed natively
        window.location.href = intentUri;
      } else if (isIOS) {
        // iOS: use iframe-based deep link approach
        var iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = deepLink;
        document.body.appendChild(iframe);
        // Just clean up the iframe; no auto-redirect (app not on App Store yet)
        setTimeout(function() { document.body.removeChild(iframe); }, 2000);
      }

      // Gallery scroll indicator
      var galleryScroll = document.getElementById('gallery-scroll');
      if (galleryScroll) {
        var dots = document.querySelectorAll('.gallery-dot');
        var badge = document.getElementById('gallery-current');
        galleryScroll.addEventListener('scroll', function() {
          var scrollLeft = galleryScroll.scrollLeft;
          var itemWidth = galleryScroll.offsetWidth;
          var currentIndex = Math.round(scrollLeft / itemWidth);
          if (badge) badge.textContent = (currentIndex + 1);
          dots.forEach(function(dot, i) {
            dot.classList.toggle('active', i === currentIndex);
          });
        });
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
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
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
    html, body {
      max-width: 100vw;
      overflow-x: hidden;
      -webkit-text-size-adjust: 100%;
      -moz-text-size-adjust: 100%;
      text-size-adjust: 100%;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0A0A0A;
      color: #FFFFFF;
      min-height: 100vh;
      min-height: -webkit-fill-available;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .container {
      max-width: 480px;
      width: 100%;
      padding: 40px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .logo {
      font-size: 20px;
      font-weight: 700;
      color: #FF3B30;
      margin-bottom: 28px;
    }
    .profile-icon {
      width: 72px;
      height: 72px;
      border-radius: 36px;
      background: linear-gradient(135deg, #1A1A2E, #2D2D44);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      margin-bottom: 14px;
      border: 2px solid rgba(167, 139, 250, 0.3);
    }
    .username {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 6px;
      background: linear-gradient(135deg, #FFFFFF, #D1D5DB);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .subtitle {
      font-size: 13px;
      color: #9CA3AF;
      margin-bottom: 28px;
      line-height: 1.4;
    }
    .store-buttons {
      display: flex;
      flex-direction: column;
      gap: 10px;
      align-items: center;
      width: 100%;
    }
    .open-app-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 12px 24px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      color: #FFFFFF;
      background: linear-gradient(135deg, #FF3B30, #FF6B5A);
      width: 100%;
      max-width: 260px;
      transition: transform 0.2s, opacity 0.2s;
      box-shadow: 0 4px 14px rgba(255, 59, 48, 0.3);
    }
    .open-app-btn:hover { opacity: 0.9; transform: scale(1.02); }
    .store-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 12px 24px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      color: #FFFFFF;
      width: 100%;
      max-width: 260px;
      transition: transform 0.2s, opacity 0.2s;
    }
    .store-btn:hover { opacity: 0.9; transform: scale(1.02); }
    .store-btn-play { background: linear-gradient(135deg, #1DB954, #17a347); }
    .store-btn-apple { background: linear-gradient(135deg, #444, #2a2a2a); }
    .store-btn-disabled {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }
    @media (min-width: 768px) {
      .container { max-width: 520px; padding: 60px 24px; }
      .logo { font-size: 22px; }
      .profile-icon { width: 88px; height: 88px; border-radius: 44px; font-size: 38px; }
      .username { font-size: 24px; }
      .subtitle { font-size: 14px; }
      .store-btn, .open-app-btn { max-width: 280px; padding: 14px 28px; font-size: 15px; }
    }
    @media (min-width: 1024px) {
      .container { max-width: 600px; padding: 80px 32px; }
      .logo { font-size: 24px; }
      .profile-icon { width: 96px; height: 96px; border-radius: 48px; font-size: 42px; }
      .username { font-size: 26px; }
      .store-btn, .open-app-btn { max-width: 300px; }
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
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>${escapeHtml(title)}</title>
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:site_name" content="Art Nepalaya">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      max-width: 100vw;
      overflow-x: hidden;
      -webkit-text-size-adjust: 100%;
      -moz-text-size-adjust: 100%;
      text-size-adjust: 100%;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0A0A0A;
      color: #FFFFFF;
      min-height: 100vh;
      min-height: -webkit-fill-available;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .container {
      max-width: 480px;
      width: 100%;
      padding: 40px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .logo {
      font-size: 20px;
      font-weight: 700;
      color: #FF3B30;
      margin-bottom: 28px;
    }
    .title {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 10px;
      background: linear-gradient(135deg, #FFFFFF, #D1D5DB);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .description {
      font-size: 13px;
      color: #9CA3AF;
      margin-bottom: 28px;
      line-height: 1.5;
    }
    .store-buttons {
      display: flex;
      flex-direction: column;
      gap: 10px;
      align-items: center;
      width: 100%;
    }
    .open-app-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 12px 24px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      color: #FFFFFF;
      background: linear-gradient(135deg, #FF3B30, #FF6B5A);
      width: 100%;
      max-width: 260px;
      transition: transform 0.2s, opacity 0.2s;
      box-shadow: 0 4px 14px rgba(255, 59, 48, 0.3);
    }
    .open-app-btn:hover { opacity: 0.9; transform: scale(1.02); }
    .store-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 12px 24px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      color: #FFFFFF;
      width: 100%;
      max-width: 260px;
      transition: transform 0.2s, opacity 0.2s;
    }
    .store-btn:hover { opacity: 0.9; transform: scale(1.02); }
    .store-btn-play { background: linear-gradient(135deg, #1DB954, #17a347); }
    .store-btn-apple { background: linear-gradient(135deg, #444, #2a2a2a); }
    .store-btn-disabled {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }
    @media (min-width: 768px) {
      .container { max-width: 520px; padding: 60px 24px; }
      .logo { font-size: 22px; }
      .title { font-size: 24px; }
      .description { font-size: 14px; }
      .store-btn, .open-app-btn { max-width: 280px; padding: 14px 28px; font-size: 15px; }
    }
    @media (min-width: 1024px) {
      .container { max-width: 600px; padding: 80px 32px; }
      .logo { font-size: 24px; }
      .title { font-size: 26px; }
      .store-btn, .open-app-btn { max-width: 300px; }
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
 * - Non-Cloudinary URLs: returns empty string (no reliable thumbnail generation possible)
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

  // For non-Cloudinary video URLs, we cannot reliably generate a thumbnail.
  // Returning an empty string allows og:image to gracefully omit rather than
  // pointing to a broken URL (extension swap would likely produce a 404).
  return '';
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
