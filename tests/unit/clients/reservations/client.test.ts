import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/server/env', () => ({
  env: {
    RESERVATIONS_BASE_URL: 'https://reservations.test/v1',
    RESERVATIONS_SCENARIO: 'normal',
  },
}))

import {
  applyChange,
  checkAvailability,
  getOperation,
  getStay,
} from '@/server/clients/reservations/client'

const validStay = {
  stay_id: 'STAY-A1',
  hotel_id: 'hotel-alba',
  room: '101',
  checkout_at: '2026-11-10T11:00:00Z',
  version: 1,
}

const request = {
  stayId: 'STAY-A1',
  requestedCheckoutAt: '2026-11-10T14:00:00Z',
  expectedVersion: 1,
  operationKey: 'approve-1',
}

const receipt = {
  stay_id: 'STAY-A1',
  checkout_at: '2026-11-10T14:00:00Z',
  version: 2,
  operation_key: 'approve-1',
  change_id: 'chg_1',
}

const apiError = (code: string) => ({ error: { code, message: code } })

const mockFetch = (status: number, body?: unknown) => {
  const text = body === undefined ? null : typeof body === 'string' ? body : JSON.stringify(body)
  const fetchMock = vi.fn().mockResolvedValue(new Response(text, { status }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const mockTimeout = () =>
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('timeout', 'TimeoutError')))

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getStay', () => {
  it('sends the authenticated headers and returns the stay', async () => {
    const fetchMock = mockFetch(200, validStay)

    const result = await getStay('remote-token', 'STAY-A1')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://reservations.test/v1/stays/STAY-A1')
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer remote-token',
      'User-Agent': 'WorkFactory-Technical-Test/1.0',
      'X-Test-Scenario': 'normal',
    })
    expect(result).toMatchObject({ ok: true, data: validStay })
  })

  it.each([
    [403, apiError('forbidden'), 'forbidden'],
    [502, '<html>Bad gateway</html>', null],
  ])('returns an api_error on a %i', async (status, body, code) => {
    mockFetch(status, body)

    const result = await getStay('remote-token', 'STAY-A1')

    expect(result).toMatchObject({ ok: false, error: { kind: 'api_error', status, code } })
  })

  it('rejects a 200 that belongs to another stay', async () => {
    mockFetch(200, { ...validStay, stay_id: 'STAY-B1', hotel_id: 'hotel-alba-b' })

    const result = await getStay('remote-token', 'STAY-A1')

    expect(result).toMatchObject({ ok: false, error: { kind: 'invalid_response' } })
  })
})

describe('checkAvailability', () => {
  const available = {
    available: true,
    reason: 'available',
    stay_version: 1,
    requested_checkout_at: request.requestedCheckoutAt,
  }

  it('sends the exact contract body', async () => {
    const fetchMock = mockFetch(200, available)

    await checkAvailability('remote-token', 'STAY-A1', request.requestedCheckoutAt)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://reservations.test/v1/availability/check')
    expect(JSON.parse(init.body)).toStrictEqual({
      stay_id: 'STAY-A1',
      requested_checkout_at: request.requestedCheckoutAt,
    })
  })

  it('returns an unavailable hour as data, not as an error', async () => {
    mockFetch(200, { ...available, available: false, reason: 'cleaning_conflict' })

    const result = await checkAvailability('remote-token', 'STAY-A1', request.requestedCheckoutAt)

    expect(result).toMatchObject({ ok: true, data: { available: false } })
  })
})

describe('applyChange', () => {
  it('sends the exact contract body', async () => {
    const fetchMock = mockFetch(201, receipt)

    await applyChange('remote-token', request)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://reservations.test/v1/changes')
    expect(JSON.parse(init.body)).toStrictEqual({
      stay_id: 'STAY-A1',
      requested_checkout_at: request.requestedCheckoutAt,
      expected_version: 1,
      operation_key: 'approve-1',
    })
  })

  it.each([
    [201, false],
    [200, true],
  ])('returns applied on a %i', async (status, replayed) => {
    mockFetch(status, receipt)

    const outcome = await applyChange('remote-token', request)

    expect(outcome).toMatchObject({ status: 'applied', receipt, replayed })
  })

  it.each([
    [409, 'version_conflict'],
    [503, 'simulated_rejection'],
  ])('returns rejected on a %i %s', async (status, code) => {
    mockFetch(status, apiError(code))

    const outcome = await applyChange('remote-token', request)

    expect(outcome).toMatchObject({ status: 'rejected', code })
  })

  it.each([
    ['a generic 503', () => mockFetch(503, apiError('service_unavailable'))],
    ['a proxy 502', () => mockFetch(502, '<html>Bad gateway</html>')],
    ['a timeout', mockTimeout],
  ])('returns uncertain on %s', async (_, mock) => {
    mock()

    const outcome = await applyChange('remote-token', request)

    expect(outcome).toMatchObject({ status: 'uncertain' })
  })

  it('returns uncertain when the receipt does not match', async () => {
    mockFetch(201, { ...receipt, version: 3 })

    const outcome = await applyChange('remote-token', request)

    expect(outcome).toMatchObject({ status: 'uncertain', reason: 'receipt_mismatch' })
  })
})

describe('getOperation', () => {
  const operation = { status: 'applied', operation_key: 'approve-1', receipt }

  it('returns applied on a matching receipt', async () => {
    const fetchMock = mockFetch(200, operation)

    const outcome = await getOperation('remote-token', request)

    expect(fetchMock.mock.calls[0][0]).toBe('https://reservations.test/v1/operations/approve-1')
    expect(outcome).toMatchObject({ status: 'applied', receipt })
  })

  it.each([
    [404, 'operation_not_found'],
    [503, 'service_unavailable'],
  ])('returns unresolved on a %i %s', async (status, code) => {
    mockFetch(status, apiError(code))

    const outcome = await getOperation('remote-token', request)

    expect(outcome).toMatchObject({ status: 'unresolved' })
  })

  it('returns unresolved when the receipt does not match', async () => {
    mockFetch(200, { ...operation, receipt: { ...receipt, checkout_at: '2026-11-10T13:00:00Z' } })

    const outcome = await getOperation('remote-token', request)

    expect(outcome).toMatchObject({ status: 'unresolved', reason: 'receipt_mismatch' })
  })
})
