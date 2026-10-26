export type CallMeta = {
  durationMs: number
  httpStatus: number | null
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

export type CallOptions = {
  method: 'GET' | 'POST'
  path: string
  token: string
  body?: unknown
}
