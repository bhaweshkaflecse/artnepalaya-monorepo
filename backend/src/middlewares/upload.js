import multer from 'multer';

/**
 * Upload Middleware Configuration
 *
 * File size limit: 10MB per file (images), 50MB for videos handled at route level.
 * Accepted formats: JPEG, PNG, WebP, GIF (images) and MP4, MOV (videos).
 *
 * Production Image Optimization:
 * In production, uploaded images are stored on Cloudinary. Responsive thumbnails
 * are served using Cloudinary transformation URLs, e.g.:
 *   https://res.cloudinary.com/<cloud>/image/upload/c_fill,w_400,q_auto,f_webp/v1/<path>
 *
 * This avoids server-side image processing (no sharp dependency needed) while
 * delivering optimized images at multiple resolutions to mobile clients.
 */

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype)) {
    file.isAppVideo = false;
    cb(null, true);
  } else if (['video/mp4', 'video/quicktime'].includes(file.mimetype)) {
    file.isAppVideo = true;
    cb(null, true);
  } else {
    cb(Object.assign(new Error('Only JPG, PNG, WEBP, GIF, MP4, and MOV allowed'), { status: 400 }), false);
  }
};

export const secureUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 6 },
});

export const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return next(Object.assign(new Error('File is too large (max 10MB)'), { status: 400 }));
    if (err.code === 'LIMIT_FILE_COUNT') return next(Object.assign(new Error('Maximum 6 files allowed (5 images + 1 video)'), { status: 400 }));
  }
  next(err);
};
