import 'server-only'
import { TIMEOUT_MS, USER_AGENT } from '@/server/clients/constants'
import type { RawResult } from '@/server/clients/types'

export type JsonRequest = {
  url: string
  method: 'GET' | 'POST'
  token: string
  scenario: string
  body?: unknown
}

export const callJson = async ({
  url,
  method,
  token,
  scenario,
  body,
}: JsonRequest): Promise<RawResult> => {
  const startedAt = performance.now()
  const elapsed = () => Math.round(performance.now() - startedAt)

  try {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': USER_AGENT,
        'X-Test-Scenario': scenario,
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
      retryAfter: response.headers.get('retry-after'),
      meta: {
        durationMs: elapsed(),
        httpStatus: response.status,
        requestId: response.headers.get('x-request-id'),
      },
    }
  } catch (error) {
    return {
      kind: 'network_error',
      reason: error instanceof Error ? error.name : 'unknown',
      meta: { durationMs: elapsed(), httpStatus: null, requestId: null },
    }
  }
}
