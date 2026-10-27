import 'server-only'
import { HttpError } from '@/server/errors'
import * as conversations from '@/server/repositories/conversations'
import type { Identity } from '@/server/schemas/identity'

type StoredMessage = conversations.StoredConversation['messages'][number]
type StoredProposal = NonNullable<StoredMessage['proposal']>
type StoredTrace = StoredMessage['traces'][number]

const guestProposal = (proposal: StoredProposal) => ({
  id: proposal.id,
  status: proposal.status,
  current_checkout_at: proposal.currentCheckoutAt,
  requested_checkout_at: proposal.requestedCheckoutAt,
  fee_eur: proposal.feeEur,
})

const managerProposal = (proposal: StoredProposal) => ({
  ...guestProposal(proposal),
  evidence: {
    document_id: proposal.policyDocumentId,
    version: proposal.policyVersion,
    quote: proposal.policyQuote,
  },
  operation_key: proposal.operationKey,
  receipt: proposal.receipt,
})

const toTrace = (trace: StoredTrace) => ({
  step: trace.step,
  ok: trace.ok,
  error: trace.error,
  duration_ms: trace.durationMs,
  remote_request_id: trace.remoteRequestId,
  detail: trace.detail,
  simulated_prompt_tokens: trace.simulatedPromptTokens,
  simulated_completion_tokens: trace.simulatedCompletionTokens,
  created_at: trace.createdAt,
})

const commonMessage = (msg: StoredMessage) => ({
  event_id: msg.eventId,
  text: msg.text,
  status: msg.status,
  message: msg.reply,
  created_at: msg.createdAt,
})

const guestMessage = (msg: StoredMessage) => ({
  ...commonMessage(msg),
  proposal: msg.proposal && guestProposal(msg.proposal),
})

const managerMessage = (msg: StoredMessage) => ({
  ...commonMessage(msg),
  proposal: msg.proposal && managerProposal(msg.proposal),
  trace_id: msg.id,
  traces: msg.traces.map(toTrace),
})

const currentStatus = (messages: StoredMessage[]) => {
  const last = messages.at(-1)
  return last?.proposal?.status ?? last?.status ?? null
}

export const getConversation = async (identity: Identity, conversationId: string) => {
  const scope =
    identity.role === 'guest' ? { ownerId: identity.token } : { hotelId: identity.hotelId }

  const conversation = await conversations.findConversation(conversationId, scope)

  if (!conversation) {
    throw new HttpError(404, 'not_found', 'Conversation not found')
  }

  return {
    conversation_id: conversation.id,
    stay_id: conversation.stayId,
    status: currentStatus(conversation.messages),
    messages: conversation.messages.map((m) =>
      identity.role === 'manager' ? managerMessage(m) : guestMessage(m)
    ),
  }
}
