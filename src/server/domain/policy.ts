import type { HotelDocument, PolicyRules } from '@/server/schemas/documents'
import { PolicyDocument, PolicySelection, RequestEvaluation } from './types'

const sameRules = (a: PolicyRules, b: PolicyRules) =>
  a.normalCheckout === b.normalCheckout &&
  a.lateCheckoutLimit === b.lateCheckoutLimit &&
  a.feeEur === b.feeEur

const mentionsInSentence = (sentence: string, value: string) =>
  new RegExp(`(^|[^\\d:])${value}([^\\d:]|$)`).test(sentence)

const findingQuoteFor = (content: string, rules: PolicyRules): string | null => {
  const sentences = content.split(/(?<=\.)\s+/)
  const values = [rules.normalCheckout, rules.lateCheckoutLimit, `${rules.feeEur}`]
  const indexes = values.map((value) => sentences.findIndex((s) => mentionsInSentence(s, value)))
  if (indexes.includes(-1)) return null

  const first = sentences[Math.min(...indexes)]
  const last = sentences[Math.max(...indexes)]
  const start = content.indexOf(first)
  return content.slice(start, content.indexOf(last, start) + last.length)
}

export const selectPolicy = (
  documents: HotelDocument[],
  scope: { orgId: string; hotelId: string }
): PolicySelection => {
  const candidates = documents.filter(
    (doc): doc is PolicyDocument =>
      doc.active &&
      doc.authority === 'approved_policy' &&
      doc.audience === 'guest' &&
      doc.orgId === scope.orgId &&
      doc.hotelId === scope.hotelId &&
      doc.policy !== null
  )

  if (candidates.length === 0) return { ok: false, reason: 'no_policy' }

  const topVersion = Math.max(...candidates.map((doc) => doc.version))

  const [chosen, ...others] = candidates.filter((doc) => doc.version === topVersion)

  if (others.some((doc) => !sameRules(doc.policy, chosen.policy))) {
    return { ok: false, reason: 'conflicting_policies' }
  }

  const quote = findingQuoteFor(chosen.content, chosen.policy) // ?? chosen.content

  if (quote === null) return { ok: false, reason: 'unquotable_policy' }

  return {
    ok: true,
    policy: {
      rules: chosen.policy,
      evidence: { documentId: chosen.documentId, version: chosen.version, quote },
    },
  }
}

export const evaluateRequest = (
  currentCheckoutAt: string,
  requestedTime: string | null,
  rules: PolicyRules
): RequestEvaluation => {
  if (requestedTime === null) return { kind: 'needs_input', currentCheckoutAt }

  const requestedCheckoutAt = `${currentCheckoutAt.slice(0, 10)}T${requestedTime}:00Z`

  if (requestedCheckoutAt <= currentCheckoutAt) {
    return { kind: 'information', currentCheckoutAt }
  }

  if (requestedTime > rules.lateCheckoutLimit) {
    return { kind: 'declined', currentCheckoutAt, limit: rules.lateCheckoutLimit }
  }

  return { kind: 'proposal', currentCheckoutAt, requestedCheckoutAt, feeEur: rules.feeEur }
}
