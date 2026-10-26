import { z } from 'zod'

export const apiErrorBodySchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string(),
  }),
})

export const id = z.string().min(1)

export const timeOfDaySchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)

export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>
