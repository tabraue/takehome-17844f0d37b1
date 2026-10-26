import { z } from 'zod'
import { timeOfDaySchema, id } from '@/server/schemas/common'

export const policyRulesSchema = z
  .object({
    normal_checkout: timeOfDaySchema,
    late_checkout_limit: timeOfDaySchema,
    fee_eur: z.number().int().nonnegative(),
  })
  .transform(({ normal_checkout, late_checkout_limit, fee_eur }) => ({
    normalCheckout: normal_checkout,
    lateCheckoutLimit: late_checkout_limit,
    feeEur: fee_eur,
  }))

export const documentSchema = z
  .object({
    document_id: id,
    org_id: id,
    hotel_id: id,
    version: z.number().int().positive(),
    authority: z.enum(['approved_policy', 'website', 'untrusted_note']),
    audience: z.enum(['guest', 'manager']),
    active: z.boolean(),
    content: z.string(),
    policy: policyRulesSchema.nullable(),
  })
  .transform(({ document_id, org_id, hotel_id, ...rest }) => ({
    documentId: document_id,
    orgId: org_id,
    hotelId: hotel_id,
    ...rest,
  }))

export type HotelDocument = z.output<typeof documentSchema>
export type PolicyRules = z.output<typeof policyRulesSchema>
