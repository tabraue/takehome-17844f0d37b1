import { z } from 'zod'
import { id } from '@/server/schemas/common'

export const messageRequestSchema = z.strictObject({
  event_id: id,
  conversation_id: id,
  stay_id: id,
  text: z.string().min(1).max(8000),
})

export type MessageRequest = z.infer<typeof messageRequestSchema>
