import 'server-only'
import { env } from '@/server/env'
import { callJson } from '@/server/clients/http'
import { DEFAULT_RETRY_DELAY_MS, MAX_RETRY_DELAY_MS } from '@/server/clients/constants'
import type { CallMeta } from '@/server/clients/types'
import type { ChatMessage, InterpretResult, ParsedContent } from '@/server/clients/llm/types'
import { apiErrorBodySchema } from '@/server/schemas/common'
import {
  chatCompletionSchema,
  INTERPRETATION_FIELDS,
  interpretationSchema,
} from '@/server/schemas/llm'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const retryDelayFrom = (header: string | null): number => {
  const seconds = Number(header)

  if (header === null || header.trim() === '' || !Number.isFinite(seconds) || seconds < 0) {
    return DEFAULT_RETRY_DELAY_MS
  }
  return Math.min(seconds * 1000, MAX_RETRY_DELAY_MS)
}

const callCompletions = (messages: ChatMessage[]) =>
  callJson({
    url: `${env.LLM_BASE_URL}/chat/completions`,
    method: 'POST',
    token: env.LLM_API_KEY,
    scenario: env.LLM_SCENARIO,
    body: { model: env.LLM_MODEL, messages },
  })

const parseContent = (content: string): ParsedContent => {
  let json: unknown

  try {
    json = JSON.parse(content)
  } catch {
    return { ok: false, reason: 'invalid_json', detail: null }
  }

  const parsed = interpretationSchema.safeParse(json)

  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join('.') || '(root)')
    return { ok: false, reason: 'invalid_output', detail: fields.join(',') }
  }

  const allowed: readonly string[] = INTERPRETATION_FIELDS
  const discardedFields = Object.keys(json as object).filter((key) => !allowed.includes(key))

  return { ok: true, interpretation: parsed.data, discardedFields }
}

export const interpretMessage = async (messages: ChatMessage[]): Promise<InterpretResult> => {
  const calls: CallMeta[] = []

  let raw = await callCompletions(messages)
  calls.push(raw.meta)

  if (raw.kind === 'response' && raw.status === 503) {
    await sleep(retryDelayFrom(raw.retryAfter))
    raw = await callCompletions(messages)
    calls.push(raw.meta)
  }

  if (raw.kind === 'network_error') {
    return { ok: false, reason: 'network_error', detail: raw.reason, calls }
  }

  if (raw.status !== 200) {
    const apiError = apiErrorBodySchema.safeParse(raw.body)
    const code = apiError.success ? apiError.data.error.code : `http_${raw.status}`
    const reason = raw.status === 503 ? 'unavailable' : 'api_error'
    return { ok: false, reason, detail: code, calls }
  }

  const completion = chatCompletionSchema.safeParse(raw.body)
  if (!completion.success) {
    return { ok: false, reason: 'invalid_response', detail: null, calls }
  }

  const result = parseContent(completion.data.choices[0].message.content)
  if (!result.ok) {
    return { ok: false, reason: result.reason, detail: result.detail, calls }
  }

  const usage = completion.data.usage
  return {
    ok: true,
    interpretation: result.interpretation,
    discardedFields: result.discardedFields,
    usage: usage
      ? {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
        }
      : null,
    calls,
  }
}
