import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';

// NOTE: In production, ensure CORS_ORIGIN includes https://app.artnepalaya.com
// (the share/deep-link domain) in addition to other allowed origins.
const corsOptions = {
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Id']
};

const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests' } }
});

const xssSanitize = (req, res, next) => {
  if (req.body) {
    const sanitizeObj = (obj) => {
      for (const key in obj) {
        if (typeof obj[key] === 'string') obj[key] = obj[key].replace(/<[^>]*>?/gm, '');
        else if (typeof obj[key] === 'object' && obj[key] !== null) sanitizeObj(obj[key]);
      }
    };
    sanitizeObj(req.body);
  }
  next();
};

export const applySecurityMiddlewares = (app) => {
  // Disable Helmet's built-in CSP so route-level CSP headers are not overridden.
  // Share pages set their own relaxed CSP; API routes get a strict CSP below.
  app.use(helmet({
    contentSecurityPolicy: false,
  }));

  app.use(cors(corsOptions));
  app.use(mongoSanitize());
  app.use(xssSanitize);

  // Strict CSP for API routes only (no HTML rendered, block everything)
  app.use('/api/', (req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    next();
  });

  app.use('/api/', globalRateLimiter);
};