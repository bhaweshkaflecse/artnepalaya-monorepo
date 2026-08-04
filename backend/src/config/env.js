import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('8080'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  MONGO_URI: z.string().url(),
  POSTGRES_URI: z.string().url(),
  REDIS_URL: z.string().url(),
  // Google OAuth
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_ANDROID_CLIENT_ID: z.string().optional(),
  GOOGLE_IOS_CLIENT_ID: z.string().optional(),
  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string(),
  CLOUDINARY_API_KEY: z.string(),
  CLOUDINARY_API_SECRET: z.string(),
  // Super Admin Protection
  SUPER_ADMIN_EMAILS: z.string().default('').transform(val => val ? val.split(',').map(e => e.trim()).filter(Boolean) : []),
  SUPER_ADMIN_IDS: z.string().default('').transform(val => val ? val.split(',').map(e => e.trim()).filter(Boolean) : []),
  SUPER_ADMIN_MASTER_CONFIRMATION_PASSWORD: z.string().optional(),
  MIN_ACTIVE_SUPERADMINS: z.string().transform(val => parseInt(val, 10)).default('1'),
  SUPER_ADMIN_ALLOW_SELF_DEMOTION: z.string().transform((val) => val === 'true').default('false'),
}).refine(data => {
  if (data.NODE_ENV === 'production') {
    return data.SUPER_ADMIN_EMAILS.length > 0 || data.SUPER_ADMIN_IDS.length > 0;
  }
  return true;
}, {
  message: "At least one SUPER_ADMIN_EMAILS or SUPER_ADMIN_IDS must be configured in production to avoid silent misconfiguration.",
  path: ['SUPER_ADMIN_EMAILS']
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;