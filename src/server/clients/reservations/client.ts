import 'server-only'
import { env } from '@/server/env'
import { callJson } from '@/server/clients/http'
import type { RawResult } from '@/server/clients/types'
import {
  CallOptions,
  ChangeOutcome,
  ChangeRequest,
  OperationOutcome,
  ReservationsResult,
} from '@/server/clients/reservations/types'
import {
  Availability,
  availabilitySchema,
  operationSchema,
  Receipt,
  receiptSchema,
  Stay,
  staySchema,
} from '@/server/schemas/reservations'
import { z } from 'zod'
import { apiErrorBodySchema } from '@/server/schemas/common'

const callReservations = ({ method, path, token, body }: CallOptions): Promise<RawResult> =>
  callJson({
    url: `${env.RESERVATIONS_BASE_URL}${path}`,
    method,
    token,
    scenario: env.RESERVATIONS_SCENARIO,
    body,
  })

const toResult = <T>(
  raw: RawResult,
  schema: z.ZodType<T>,
  okStatuses: readonly number[]
): ReservationsResult<T> => {
  if (raw.kind === 'network_error') {
    return { ok: false, error: { kind: 'network_error', reason: raw.reason }, meta: raw.meta }
  }

  if (!okStatuses.includes(raw.status)) {
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

  const result = toResult(raw, staySchema, [200])

  if (result.ok && result.data.stay_id !== stayId) {
    return { ok: false, error: { kind: 'invalid_response', status: 200 }, meta: result.meta }
  }
  return result
}

export const checkAvailability = async (
  token: string,
  stayId: string,
  requestedCheckoutAt: string
): Promise<ReservationsResult<Availability>> => {
  const raw = await callReservations({
    method: 'POST',
    path: '/availability/check',
    token,
    body: { stay_id: stayId, requested_checkout_at: requestedCheckoutAt },
  })

  const result = toResult(raw, availabilitySchema, [200])

  if (
    result.ok &&
    (result.data.requested_checkout_at !== requestedCheckoutAt ||
      result.data.available !== (result.data.reason === 'available'))
  ) {
    return { ok: false, error: { kind: 'invalid_response', status: 200 }, meta: result.meta }
  }
  return result
}

export const receiptMatches = (receipt: Receipt, request: ChangeRequest): boolean =>
  receipt.stay_id === request.stayId &&
  receipt.checkout_at === request.requestedCheckoutAt &&
  receipt.operation_key === request.operationKey &&
  receipt.version === request.expectedVersion + 1

export const applyChange = async (
  token: string,
  request: ChangeRequest
): Promise<ChangeOutcome> => {
  const raw = await callReservations({
    method: 'POST',
    path: '/changes',
    token,
    body: {
      stay_id: request.stayId,
      requested_checkout_at: request.requestedCheckoutAt,
      expected_version: request.expectedVersion,
      operation_key: request.operationKey,
    },
  })

  const result = toResult(raw, receiptSchema, [200, 201])

  if (result.ok) {
    if (!receiptMatches(result.data, request)) {
      return { status: 'uncertain', reason: 'receipt_mismatch', detail: null, meta: result.meta }
    }
    // !return 200 = operation already applied
    return {
      status: 'applied',
      receipt: result.data,
      replayed: result.meta.httpStatus === 200,
      meta: result.meta,
    }
  }

  const { error, meta } = result
  if (error.kind === 'network_error') {
    return { status: 'uncertain', reason: 'network_error', detail: error.reason, meta }
  }
  if (error.kind === 'invalid_response') {
    return { status: 'uncertain', reason: 'unexpected_response', detail: null, meta }
  }

  if (error.code !== null && error.message !== null) {
    const isClientError = error.status >= 400 && error.status < 500
    const isSimulatedRejection = error.status === 503 && error.code === 'simulated_rejection'
    if (isClientError || isSimulatedRejection) {
      return {
        status: 'rejected',
        httpStatus: error.status,
        code: error.code,
        message: error.message,
        meta,
      }
    }
  }

  return {
    status: 'uncertain',
    reason: error.status >= 500 ? 'server_error' : 'unexpected_response',
    detail: error.code,
    meta,
  }
}

export const getOperation = async (
  token: string,
  request: ChangeRequest
): Promise<OperationOutcome> => {
  const raw = await callReservations({
    method: 'GET',
    path: `/operations/${encodeURIComponent(request.operationKey)}`,
    token,
  })

  const result = toResult(raw, operationSchema, [200])

  if (result.ok) {
    const { operation_key, receipt } = result.data
    if (operation_key !== request.operationKey || !receiptMatches(receipt, request)) {
      return { status: 'unresolved', reason: 'receipt_mismatch', detail: null, meta: result.meta }
    }
    return { status: 'applied', receipt, meta: result.meta }
  }

  const { error, meta } = result
  if (error.kind === 'network_error') {
    return { status: 'unresolved', reason: 'network_error', detail: error.reason, meta }
  }
  if (error.kind === 'invalid_response') {
    return { status: 'unresolved', reason: 'unexpected_response', detail: null, meta }
  }
  if (error.status === 404 && error.code === 'operation_not_found') {
    return { status: 'unresolved', reason: 'not_found', detail: error.code, meta }
  }
  return {
    status: 'unresolved',
    reason: error.status >= 500 ? 'server_error' : 'unexpected_response',
    detail: error.code,
    meta,
  }
}
