import 'server-only'
import { env } from '@/server/env'
import { TIMEOUT_MS, USER_AGENT } from '@/server/clients/constants'
import { CallOptions, RawResult, ReservationsResult } from '@/server/clients/reservations/types'
import { Stay, staySchema } from '@/server/schemas/reservations'
import { z } from 'zod'
import { apiErrorBodySchema } from '@/server/schemas/common'

const callReservations = async ({ method, path, token, body }: CallOptions): Promise<RawResult> => {
  const startedAt = performance.now()
  const elapsed = () => Math.round(performance.now() - startedAt)

  try {
    const response = await fetch(`${env.RESERVATIONS_BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': USER_AGENT,
        'X-Test-Scenario': env.RESERVATIONS_SCENARIO,
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    })

    const text = await response.text()
    let parsed: unknown = null
    if (text) {
      try {
        parsed = JSON.parse(text)
      } catch {
        parsed = null
      }
    }

    return {
      kind: 'response',
      status: response.status,
      body: parsed,
      meta: {
        durationMs: elapsed(),
        httpStatus: response.status,
      },
    }
  } catch (error) {
    return {
      kind: 'network_error',
      reason: error instanceof Error ? error.name : 'unknown',
      meta: { durationMs: elapsed(), httpStatus: null },
    }
  }
}

const toResult = <T>(raw: RawResult, schema: z.ZodType<T>): ReservationsResult<T> => {
  if (raw.kind === 'network_error') {
    return { ok: false, error: { kind: 'network_error', reason: raw.reason }, meta: raw.meta }
  }

  if (raw.status !== 200) {
    const apiError = apiErrorBodySchema.safeParse(raw.body)
    return {
      ok: false,
      error: {
        kind: 'api_error',
        status: raw.status,
        code: apiError.success ? apiError.data.error.code : null,
        message: apiError.success ? apiError.data.error.message : null,
      },
      meta: raw.meta,
    }
  }

  const parsed = schema.safeParse(raw.body)
  if (!parsed.success) {
    return { ok: false, error: { kind: 'invalid_response', status: raw.status }, meta: raw.meta }
  }
  return { ok: true, data: parsed.data, meta: raw.meta }
}

export const getStay = async (token: string, stayId: string): Promise<ReservationsResult<Stay>> => {
  const raw = await callReservations({
    method: 'GET',
    path: `/stays/${encodeURIComponent(stayId)}`,
    token,
  })
  const result = toResult(raw, staySchema)

  if (result.ok && result.data.stay_id !== stayId) {
    return { ok: false, error: { kind: 'invalid_response', status: 200 }, meta: result.meta }
  }
  return result
}

// TODO
/* export const checkAvailability = (token, stayId, requestedCheckoutAt) => {
  POST /availability/check
}

export const applyChange = (
  token,
  { stayId, requestedCheckoutAt, expectedVersion, operationKey }
) => {
  POST /changes
}

export const getOperation = (token, operationKey) => {
  GET /operations/{operation_key}
} */
