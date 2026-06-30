import { z } from 'zod';

const BLOCKED_SOCIAL_DOMAINS = [
  'facebook.com',
  'fb.com',
  'm.facebook.com',
  'm.me',
  'instagram.com',
  'x.com',
  'twitter.com',
  'tiktok.com',
  'threads.net',
  'linkedin.com',
  'youtube.com',
];

function containsBlockedSocialDomain(value) {
  if (!value) return false;
  const lower = value.toLowerCase();
  return BLOCKED_SOCIAL_DOMAINS.some((domain) => lower.includes(domain));
}

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
    location: z.string().max(100).optional().nullable(),
    website: z.string().max(200).optional().nullable(),
    whatsapp: z.string().max(200).optional().nullable(),
    contactPhone: z.string().max(50).optional().nullable(),
    nsfwBlurEnabled: z.boolean().optional(),
    showMatureContent: z.boolean().optional()
    
  }).strict()
    .refine((data) => {
      if (data.website && containsBlockedSocialDomain(data.website)) return false;
      if (data.whatsapp && containsBlockedSocialDomain(data.whatsapp)) return false;
      return true;
    }, {
      message: 'Social media links are currently not supported.',
      path: ['website'],
    })
});

export const paginationSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).default("1"),
    limit: z.string().regex(/^\d+$/).transform(Number).default("20")
  }),
  params: z.record(z.string()).optional(),
  body: z.any().optional(),
});