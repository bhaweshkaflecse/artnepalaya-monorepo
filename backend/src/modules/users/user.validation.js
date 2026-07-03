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
  'snapchat.com',
  'snap.com',
];

// Pinterest is explicitly ALLOWED - artists use it as a portfolio platform
const ALLOWED_DOMAINS = ['pinterest.com'];

// Maps blocked domains to friendly platform names for error messages
const DOMAIN_PLATFORM_NAMES = {
  'facebook.com': 'Facebook',
  'fb.com': 'Facebook',
  'm.facebook.com': 'Facebook',
  'm.me': 'Facebook',
  'instagram.com': 'Instagram',
  'x.com': 'X/Twitter',
  'twitter.com': 'X/Twitter',
  'tiktok.com': 'TikTok',
  'threads.net': 'Threads',
  'linkedin.com': 'LinkedIn',
  'youtube.com': 'YouTube',
  'snapchat.com': 'Snapchat',
  'snap.com': 'Snapchat',
};

/**
 * Checks if a URL/value contains a blocked social media domain using proper
 * domain boundary matching. Avoids false positives like "proxy.com" matching "x.com".
 *
 * Returns the platform name if blocked, or null if allowed.
 */
function getBlockedPlatform(value) {
  if (!value) return null;

  let normalized = value.toLowerCase().trim();

  // Strip protocol if present
  normalized = normalized.replace(/^https?:\/\//, '');

  // Strip trailing path/query/hash for domain extraction
  const domainPart = normalized.split('/')[0].split('?')[0].split('#')[0];

  // Check if explicitly allowed first (e.g., pinterest.com)
  for (const allowed of ALLOWED_DOMAINS) {
    if (domainPart === allowed || domainPart.endsWith('.' + allowed)) {
      return null;
    }
  }

  // Check against blocked domains with proper boundary matching
  for (const blocked of BLOCKED_SOCIAL_DOMAINS) {
    // Exact domain match (e.g., "facebook.com")
    if (domainPart === blocked) {
      return DOMAIN_PLATFORM_NAMES[blocked] || blocked;
    }
    // Subdomain match (e.g., "www.facebook.com", "m.facebook.com")
    if (domainPart.endsWith('.' + blocked)) {
      return DOMAIN_PLATFORM_NAMES[blocked] || blocked;
    }
  }

  return null;
}

/**
 * Validates that a value looks like a phone number (digits, +, spaces, dashes, parentheses).
 * Returns true if valid phone number format, false if it contains URL-like patterns.
 */
function isValidPhoneNumber(value) {
  if (!value) return true;
  const trimmed = value.trim();
  if (!trimmed) return true;

  // Reject if it looks like a URL (contains :// or www. or common TLDs)
  if (/(:\/\/|www\.|\.com|\.net|\.org|\.io)/i.test(trimmed)) {
    return false;
  }

  // Allow only digits, +, -, spaces, parentheses, and dots (common phone formats)
  return /^[\d\s+\-().]+$/.test(trimmed);
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
    .superRefine((data, ctx) => {
      // Validate website field - check for blocked social domains
      if (data.website) {
        const blockedPlatform = getBlockedPlatform(data.website);
        if (blockedPlatform) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${blockedPlatform} profile links are not supported.`,
            path: ['website'],
          });
        }
      }

      // Validate whatsapp field - must be phone number only, no social links
      if (data.whatsapp) {
        const blockedPlatform = getBlockedPlatform(data.whatsapp);
        if (blockedPlatform) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${blockedPlatform} profile links are not supported.`,
            path: ['whatsapp'],
          });
        } else if (!isValidPhoneNumber(data.whatsapp)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Please enter a valid WhatsApp number.',
            path: ['whatsapp'],
          });
        }
      }

      // Validate contactPhone field - must be phone number only
      if (data.contactPhone) {
        if (!isValidPhoneNumber(data.contactPhone)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Please enter a valid phone number.',
            path: ['contactPhone'],
          });
        }
      }
    })
});

/**
 * Validation schema for PUT /me/notification-preferences
 * Validates the structure: { push?: { ...booleans }, inApp?: { ...booleans } }
 */
const notificationTypeToggles = z.object({
  like: z.boolean().optional(),
  save: z.boolean().optional(),
  follow: z.boolean().optional(),
  comment: z.boolean().optional(),
  adminBroadcast: z.boolean().optional(),
}).strict().optional();

export const notificationPreferencesSchema = z.object({
  body: z.object({
    push: notificationTypeToggles,
    inApp: notificationTypeToggles,
  }).strict(),
  params: z.record(z.string()).optional(),
  query: z.record(z.string()).optional(),
});

export const paginationSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).default("1"),
    limit: z.string().regex(/^\d+$/).transform(Number).default("20")
  }),
  params: z.record(z.string()).optional(),
  body: z.any().optional(),
});
