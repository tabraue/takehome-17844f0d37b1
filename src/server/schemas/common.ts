import { z } from 'zod'

export const apiErrorBodySchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string(),
  }),
})

export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>
