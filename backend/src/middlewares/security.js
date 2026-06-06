import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';

const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://artnepalaya.com', 'https://admin.artnepalaya.com'] 
    : ['http://localhost:5173', 'http://192.168.1.100'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
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
  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(mongoSanitize());
  app.use(xssSanitize);
  app.use('/api/', globalRateLimiter);
};