import { Router } from 'express';
import { Post } from '../posts/post.model.js';

const router = Router();

/**
 * GET /p/:postId
 * Share landing page for posts/artworks.
 * Serves HTML with Open Graph meta tags for rich link previews,
 * a beautiful dark-themed landing page, and deep link redirect attempt.
 */
router.get('/p/:postId', async (req, res) => {
  try {
    const { postId } = req.params;

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
    const ogTitle = caption
      ? `${caption.substring(0, 60)}${caption.length > 60 ? '...' : ''} - by ${authorName}`
      : `Artwork by ${authorName}`;
    const ogDescription = caption
      ? `${caption.substring(0, 200)}${caption.length > 200 ? '...' : ''}`
      : `Check out this artwork by ${authorFullName} on Art Nepalaya`;
    const ogImage = post.media && post.media.length > 0 ? post.media[0].url : '';
    const ogUrl = `https://api.artnepalaya.com/p/${postId}`;
    const deepLink = `artnepalaya://p/${postId}`;
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

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(ogTitle)}">
  <meta name="twitter:description" content="${escapeHtml(ogDescription)}">
  <meta name="twitter:image" content="${escapeHtml(ogImage)}">

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
    }
    .artwork-preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
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
    .author-name {
      font-size: 16px;
      font-weight: 600;
      color: #FFFFFF;
    }
    .likes-count {
      font-size: 13px;
      color: #9CA3AF;
    }
    .caption {
      width: 100%;
      font-size: 14px;
      line-height: 1.5;
      color: #E5E5E5;
      margin-bottom: 24px;
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
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">Art Nepalaya</div>

    <div class="artwork-preview">
      ${ogImage
        ? `<img src="${escapeHtml(ogImage)}" alt="Artwork by ${escapeHtml(authorName)}">`
        : '<div class="artwork-placeholder">&#x1F3A8;</div>'}
    </div>

    <div class="author-row">
      <div class="author-avatar">
        ${post.authorId?.avatarUrl
          ? `<img src="${escapeHtml(post.authorId.avatarUrl)}" alt="${escapeHtml(authorName)}">`
          : ''}
      </div>
      <div class="author-info">
        <div class="author-name">${escapeHtml(authorName)}</div>
        <div class="likes-count">${likesCount} ${likesCount === 1 ? 'like' : 'likes'}</div>
      </div>
    </div>

    ${caption ? `<div class="caption">${escapeHtml(caption)}</div>` : ''}

    <div class="cta-section">
      <div class="cta-title">View in Art Nepalaya</div>
      <div class="cta-subtitle">Discover and share artwork from Nepali artists</div>

      <div class="store-buttons">
        <a href="${escapeHtml(deepLink)}" class="open-app-btn">Open in App</a>
        <a href="https://play.google.com/store/apps/details?id=com.artnepalaya.mobile" class="store-btn store-btn-play">Get on Google Play</a>
        <a href="https://apps.apple.com/app/art-nepalaya/id000000000" class="store-btn store-btn-apple">Download on App Store</a>
      </div>
    </div>
  </div>

  <script>
    // Attempt deep link redirect for users who have the app installed
    (function() {
      var deepLink = "${deepLink}";
      var timeout;

      // Try to open the app via custom scheme
      var iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = deepLink;
      document.body.appendChild(iframe);

      // Clean up iframe after attempt
      timeout = setTimeout(function() {
        document.body.removeChild(iframe);
      }, 2000);
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
  const ogUrl = `https://api.artnepalaya.com/u/${username}`;

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
      <a href="https://apps.apple.com/app/art-nepalaya/id000000000" class="store-btn store-btn-apple">Download on App Store</a>
    </div>
  </div>

  <script>
    (function() {
      var deepLink = "${deepLink}";
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
      <a href="https://apps.apple.com/app/art-nepalaya/id000000000" class="store-btn store-btn-apple">Download on App Store</a>
    </div>
  </div>

  ${deepLink ? `<script>
    (function() {
      var deepLink = "${deepLink}";
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
