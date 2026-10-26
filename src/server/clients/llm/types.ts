import type { CallMeta } from '@/server/clients/types'
import type { Interpretation } from '@/server/schemas/llm'

export type ParsedContent =
  | { ok: true; interpretation: Interpretation; discardedFields: string[] }
  | { ok: false; reason: 'invalid_json' | 'invalid_output'; detail: string | null }

export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type SimulatedUsage = {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export type InterpretFailureReason =
  | 'unavailable'
  | 'network_error'
  | 'api_error'
  | 'invalid_response'
  | 'invalid_json'
  | 'invalid_output'

export type InterpretResult =
  | {
      ok: true
      interpretation: Interpretation
      discardedFields: string[]
      usage: SimulatedUsage | null
      calls: CallMeta[]
    }
  | {
      ok: false
      reason: InterpretFailureReason
      detail: string | null
      calls: CallMeta[]
    }
