import { z } from 'zod'

export const AnchorSchema = z.object({
  text: z.array(z.string()).optional(),
  icon: z.string().optional(),
  fallback: z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]).optional(),
})

export const MapStepSchema = z.object({
  anchor: AnchorSchema,
  voice: z.string(),
  captionUr: z.string(),
  whyUr: z.string(),
  captionEn: z.string().max(160).optional(),
  whyEn: z.string().max(160).optional(),
  labelEn: z.string().optional(),
  expectNext: z
    .string()
    .regex(/^[a-z0-9_]+$/)
    .optional(),
})

export const ScreenMapSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  app: z.enum(['whatsapp', 'camera', 'jazzcash', 'unknown']),
  titleUr: z.string(),
  match: z.object({
    any: z.array(z.string()),
    minHits: z.number().int().min(1),
    none: z.array(z.string()).optional(),
  }),
  tasks: z.object({
    photo: z.array(MapStepSchema).optional(),
    video_call: z.array(MapStepSchema).optional(),
    voice_note: z.array(MapStepSchema).optional(),
    send_money: z.array(MapStepSchema).optional(),
  }),
})

export type ScreenMapData = z.infer<typeof ScreenMapSchema>
