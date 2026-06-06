import { z } from 'zod';
export const paginationSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).default("1"),
    limit: z.string().regex(/^\d+$/).transform(Number).default("20"),
    filter: z.enum(['all', 'unread', 'read']).default('all')
  })
});