import { z } from 'zod';

export const createPostSchema = z.object({
  body: z.object({
    caption: z.string().max(2200).optional(),
    
    // 1. Convert form-data string "true" into boolean, keep your custom error
    isHumanMade: z.preprocess(
      (val) => val === 'true' || val === true, 
      z.literal(true, {
        errorMap: () => ({ message: "You must declare that this artwork is human-made." })
      })
    ),

    // NSFW flag - convert form-data string "true" into boolean
    isNsfw: z.preprocess(
      (val) => val === 'true' || val === true,
      z.boolean()
    ).optional().default(false),
    
    // 2. Convert form-data string into array, keep your max(15) and lowercase rules
    tags: z.preprocess(
      (val) => {
        if (typeof val === 'string') {
          try { return JSON.parse(val); } catch (e) { return [val]; }
        }
        return val || [];
      }, 
      z.array(z.string().toLowerCase()).max(15).optional()
    ),

    // 3. Media validation: max 6 items total, max 5 images, max 1 video
    media: z.preprocess(
      (val) => {
        if (!val) return [];
        if (typeof val === 'string') {
          try { return JSON.parse(val); } catch (e) { return []; }
        }
        return val;
      },
      z.array(
        z.object({
          type: z.enum(['image', 'video']),
          url: z.string().optional(),
        }).passthrough()
      ).max(6, 'Maximum 6 media items allowed')
        .refine(
          (items) => items.filter((i) => i.type === 'image').length <= 5,
          { message: 'Maximum 5 images allowed per post' }
        )
        .refine(
          (items) => items.filter((i) => i.type === 'video').length <= 1,
          { message: 'Maximum 1 video allowed per post' }
        )
    ).optional() 
  })
});

export const feedPaginationSchema = z.object({
  query: z.object({
    cursor: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid cursor").optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).default("15")
  })
});