import type { Receipt } from '@/server/schemas/reservations'

export type CallMeta = {
  durationMs: number
  httpStatus: number | null
  requestedId: string | null
}

export type RawResult =
  | { kind: 'response'; status: number; body: unknown; meta: CallMeta }
  | { kind: 'network_error'; reason: string; meta: CallMeta }

export type ReservationsError =
  | { kind: 'api_error'; status: number; code: string | null; message: string | null }
  | { kind: 'invalid_response'; status: number }
  | { kind: 'network_error'; reason: string }

export type ReservationsResult<T> =
  { ok: true; data: T; meta: CallMeta } | { ok: false; error: ReservationsError; meta: CallMeta }

export type ChangeRequest = {
  stayId: string
  requestedCheckoutAt: string
  expectedVersion: number
  operationKey: string
}

export type ChangeOutcome =
  | { status: 'applied'; receipt: Receipt; replayed: boolean; meta: CallMeta }
  | { status: 'rejected'; httpStatus: number; code: string; message: string; meta: CallMeta }
  | {
      status: 'uncertain'
      reason: 'network_error' | 'server_error' | 'unexpected_response' | 'receipt_mismatch'
      detail: string | null
      meta: CallMeta
    }

export type OperationOutcome =
  | { status: 'applied'; receipt: Receipt; meta: CallMeta }
  | {
      status: 'unresolved'
      reason:
        'not_found' | 'network_error' | 'server_error' | 'unexpected_response' | 'receipt_mismatch'
      detail: string | null
      meta: CallMeta
    }

export type CallOptions = {
  method: 'GET' | 'POST'
  path: string
  token: string
  body?: unknown
}
