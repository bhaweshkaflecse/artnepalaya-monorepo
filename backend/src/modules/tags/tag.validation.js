import { z } from 'zod';
export const searchTagsSchema = z.object({
  query: z.object({
    q: z.string().max(50).optional().default(''),
    limit: z.string().regex(/^\d+$/).transform(Number).default("10")
  })
});