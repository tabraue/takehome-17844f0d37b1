import { z } from 'zod'

const utcDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
const version = z.number().int().positive()

export const staySchema = z.object({
  stay_id: z.string().min(1),
  hotel_id: z.string().min(1),
  room: z.string().min(1),
  checkout_at: utcDateTime,
  version,
})

export const availabilitySchema = z.object({
  available: z.boolean(),
  reason: z.enum([
    'available',
    'not_later_than_current_checkout',
    'after_max_checkout',
    'cleaning_conflict',
  ]),
  stay_version: version,
  requested_checkout_at: utcDateTime,
})

export const receiptSchema = z.object({
  stay_id: z.string().min(1),
  checkout_at: utcDateTime,
  version,
  operation_key: z.string().min(1),
  change_id: z.string().min(1),
})

export const operationSchema = z.object({
  status: z.literal('applied'),
  operation_key: z.string().min(1),
  receipt: receiptSchema,
})

export type Stay = z.infer<typeof staySchema>
export type Availability = z.infer<typeof availabilitySchema>
export type Receipt = z.infer<typeof receiptSchema>
export type Operation = z.infer<typeof operationSchema>
