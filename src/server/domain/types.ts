import type { HotelDocument, PolicyRules } from '@/server/schemas/documents'

export type Evidence = { documentId: string; version: number; quote: string }

export type HotelPolicy = { rules: PolicyRules; evidence: Evidence }

export type PolicySelection =
  | { ok: true; policy: HotelPolicy }
  | { ok: false; reason: 'no_policy' | 'conflicting_policies' | 'unquotable_policy' }

export type PolicyDocument = HotelDocument & { policy: PolicyRules }

export type RequestEvaluation =
  | { kind: 'needs_input'; currentCheckoutAt: string }
  | { kind: 'information'; currentCheckoutAt: string }
  | { kind: 'declined'; currentCheckoutAt: string; limit: string }
  | { kind: 'proposal'; currentCheckoutAt: string; requestedCheckoutAt: string; feeEur: number }
