import { z } from 'zod';
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const queryPaginationSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).default("1"),
    limit: z.string().regex(/^\d+$/).transform(Number).default("50"),
    status: z.string().optional()
  })
});

export const updateUserStatusSchema = z.object({
  params: z.object({ userId: z.string().regex(objectIdRegex) }),
  body: z.object({ status: z.enum(['active', 'suspended', 'banned']) })
});

export const reportIdParamsSchema = z.object({ params: z.object({ reportId: z.string().regex(objectIdRegex) }) });
export const postIdParamsSchema = z.object({ params: z.object({ postId: z.string().regex(objectIdRegex) }) });
export const featurePostSchema = z.object({ body: z.object({ postId: z.string().regex(objectIdRegex) }) });