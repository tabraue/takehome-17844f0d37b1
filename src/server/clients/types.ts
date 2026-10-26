export type CallMeta = {
  durationMs: number
  httpStatus: number | null
  requestId: string | null
}

export type RawResult =
  | {
      kind: 'response'
      status: number
      body: unknown
      retryAfter: string | null
      meta: CallMeta
    }
  | { kind: 'network_error'; reason: string; meta: CallMeta }
