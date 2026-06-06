import { z } from 'zod';

export const updateProfileSchema = z.object({
  body: z.object({
    username: z.string().min(3).max(30).trim().optional(),
    fullName: z.string().min(2).max(50).trim().optional(),
    avatarUrl: z.string().url().optional(),
    
    // Admins must be set directly in the DB. We exclude 'Admin' here to prevent privilege escalation!
    role: z.enum(['Artist', 'Art Lover', 'Business', 'Gallery']).optional(), 
    
    subRoles: z.array(z.string()).max(5).optional(),
    
    // CRITICAL: Kept as standard strings (not ObjectIds) to match our Feed ranking algorithm
    interests: z.array(z.string()).max(10).optional(), 
    
    // Accepts ISO 8601 strings (from mobile app) or native Date objects
    dob: z.string().datetime().or(z.date()).optional(),

    bio: z.string().max(300).optional(),
    nsfwBlurEnabled: z.boolean().optional()
    
  }).strict() // STRICT is crucial here: it prevents hackers from passing {"isAdult": true} or {"status": "active"} in the body
});

export const paginationSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).default("1"),
    limit: z.string().regex(/^\d+$/).transform(Number).default("20")
  })
});