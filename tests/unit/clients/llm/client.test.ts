import { readFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/server/env', () => ({
  env: {
    LLM_BASE_URL: 'https://llm.test/v1',
    LLM_MODEL: 'wf-late-checkout-mock-v1',
    LLM_SCENARIO: 'normal',
    LLM_API_KEY: 'llm-key',
  },
}))

import { interpretMessage, retryDelayFrom } from '@/server/clients/llm/client'

type Fixture = { id: string; output?: unknown; output_raw?: string }

const fixtures = new Map(
  readFileSync(path.join(process.cwd(), 'data/salidas-modelo.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as Fixture)
    .map((fixture) => [fixture.id, fixture])
)

const completionFor = (id: string) => {
  const fixture = fixtures.get(id)
  if (!fixture) throw new Error(`Unknown fixture ${id}`)
  const content = fixture.output_raw ?? JSON.stringify(fixture.output)
  return {
    choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    usage_simulated: true,
  }
}

const response = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers })

const ok = (id: string, requestId = 'req-ok') =>
  response(200, completionFor(id), { 'X-Request-ID': requestId })

const unavailable = (retryAfter = '0') =>
  response(
    503,
    {
      error: {
        message: 'Servicio temporalmente no disponible.',
        type: 'server_error',
        code: 'temporarily_unavailable',
      },
    },
    { 'Retry-After': retryAfter, 'X-Request-ID': 'req-503' }
  )

const messages = [{ role: 'user' as const, content: 'Quiero salir a las 14:00' }]

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('interpretMessage', () => {
  it('sends the authenticated headers and only model and messages in the body', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(ok('valid_es'))
    vi.stubGlobal('fetch', fetchMock)

    await interpretMessage(messages)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://llm.test/v1/chat/completions')
    expect(init.method).toBe('POST')
    expect(init.headers).toStrictEqual({
      Authorization: 'Bearer llm-key',
      'User-Agent': 'WorkFactory-Technical-Test/1.0',
      'X-Test-Scenario': 'normal',
      'Content-Type': 'application/json',
    })
    expect(JSON.parse(init.body)).toStrictEqual({ model: 'wf-late-checkout-mock-v1', messages })
  })

  it.each([
    ['valid_es', { requested_time: '14:00', language: 'es' }],
    ['valid_en', { requested_time: '14:00', language: 'en' }],
    ['missing_time', { requested_time: null, language: 'es' }],
  ])('accepts %s', async (id, expected) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(ok(id)))

    const result = await interpretMessage(messages)

    expect(result).toStrictEqual({
      ok: true,
      interpretation: { intent: 'late_checkout', ...expected },
      discardedFields: [],
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      calls: [{ durationMs: expect.any(Number), httpStatus: 200, requestId: 'req-ok' }],
    })
  })

  it('rejects invalid_time as invalid_output, naming the field', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(ok('invalid_time')))

    const result = await interpretMessage(messages)

    expect(result).toMatchObject({ ok: false, reason: 'invalid_output', detail: 'requested_time' })
  })

  it('rejects malformed_json as invalid_json', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(ok('malformed_json')))

    const result = await interpretMessage(messages)

    expect(result).toMatchObject({ ok: false, reason: 'invalid_json', detail: null })
  })

  it('discards privilege fields and keeps only the three allowed ones', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(ok('privilege_fields')))

    const result = await interpretMessage(messages)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.interpretation).toStrictEqual({
      intent: 'late_checkout',
      requested_time: '14:00',
      language: 'es',
    })
    expect(result.discardedFields.sort()).toStrictEqual(['approved', 'fee', 'hotel_id', 'role'])
  })

  it('rejects a 200 whose body is not a chat completion', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response(200, { choices: [] })))

    const result = await interpretMessage(messages)

    expect(result).toMatchObject({ ok: false, reason: 'invalid_response' })
  })

  it('retries once after a 503 and keeps both request ids', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(unavailable())
      .mockResolvedValueOnce(ok('valid_es'))
    vi.stubGlobal('fetch', fetchMock)

    const result = await interpretMessage(messages)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result).toMatchObject({
      ok: true,
      calls: [
        { httpStatus: 503, requestId: 'req-503' },
        { httpStatus: 200, requestId: 'req-ok' },
      ],
    })
  })

  it('gives up after two 503s', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(unavailable())
      .mockResolvedValueOnce(unavailable())
    vi.stubGlobal('fetch', fetchMock)

    const result = await interpretMessage(messages)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result).toMatchObject({
      ok: false,
      reason: 'unavailable',
      detail: 'temporarily_unavailable',
    })
    if (result.ok) return
    expect(result.calls).toHaveLength(2)
  })

  it('caps the Retry-After wait at 2 seconds', async () => {
    vi.useFakeTimers()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(unavailable('30'))
      .mockResolvedValueOnce(ok('valid_es'))
    vi.stubGlobal('fetch', fetchMock)

    const pending = interpretMessage(messages)
    await vi.advanceTimersByTimeAsync(1_999)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)

    await expect(pending).resolves.toMatchObject({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it.each([
    [401, 'invalid_api_key'],
    [422, 'invalid_request'],
    [429, 'rate_limited'],
  ])('returns api_error on %i without retrying', async (status, code) => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(status, { error: { code, message: code } }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await interpretMessage(messages)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({ ok: false, reason: 'api_error', detail: code })
  })

  it('falls back to the HTTP status when the error body is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(new Response('Bad gateway', { status: 502 }))
    )

    const result = await interpretMessage(messages)

    expect(result).toMatchObject({ ok: false, reason: 'api_error', detail: 'http_502' })
  })

  it('returns network_error when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('fetch failed')))

    const result = await interpretMessage(messages)

    expect(result).toStrictEqual({
      ok: false,
      reason: 'network_error',
      detail: 'TypeError',
      calls: [{ durationMs: expect.any(Number), httpStatus: null, requestId: null }],
    })
  })
})

describe('retryDelayFrom', () => {
  it.each([
    [null, 1000],
    ['', 1000],
    ['1', 1000],
    ['0', 0],
    ['1.5', 1500],
    ['30', 2000],
    ['-1', 1000],
    ['Wed, 21 Oct 2026 07:28:00 GMT', 1000],
  ])('maps Retry-After %s to %i ms', (header, expected) => {
    expect(retryDelayFrom(header)).toBe(expected)
  })
})
