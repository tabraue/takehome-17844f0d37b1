import { z } from 'zod'
import { timeOfDaySchema } from '@/server/schemas/common'

export const chatCompletionSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string() }) })).min(1),
  usage: z
    .object({
      prompt_tokens: z.number().int().nonnegative(),
      completion_tokens: z.number().int().nonnegative(),
      total_tokens: z.number().int().nonnegative(),
    })
    .optional(),
})

export const INTERPRETATION_FIELDS = ['intent', 'requested_time', 'language'] as const

export const interpretationSchema = z.object({
  intent: z.literal('late_checkout'),
  requested_time: timeOfDaySchema.nullable(),
  language: z.enum(['es', 'en']),
})

export type Interpretation = z.infer<typeof interpretationSchema>
