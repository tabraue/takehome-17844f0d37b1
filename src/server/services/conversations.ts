import 'server-only'
import { HttpError } from '@/server/errors'
import * as conversations from '@/server/repositories/conversations'
import type { Identity, ManagerIdentity } from '@/server/schemas/identity'
import { storedReceipt } from '@/server/schemas/reservations'

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
  receipt: storedReceipt(proposal.receipt),
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
  created_at: trace.createdAt.toISOString(),
})

const commonMessage = (msg: StoredMessage) => ({
  event_id: msg.eventId,
  text: msg.text,
  status: msg.status,
  message: msg.reply,
  created_at: msg.createdAt.toISOString(),
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

const declineReasonLabels: Record<string, string> = {
  not_later_than_current_checkout: 'La hora solicitada no es posterior a la salida actual.',
  after_max_checkout: 'La hora solicitada supera el límite de salida tardía del hotel.',
  cleaning_conflict: 'Hay un conflicto con la limpieza de la habitación.',
}

const declineReason = (message: StoredMessage) => {
  const trace = message.traces.find((item) => item.step === 'reservations.check_availability')
  const detail = trace?.detail

  if (!detail || typeof detail !== 'object' || !('reason' in detail)) return null
  const code = detail.reason
  if (typeof code !== 'string') return null

  return { code, label: declineReasonLabels[code] ?? code }
}

export const listDeclinedRequests = async (manager: ManagerIdentity) => {
  const hotelConversations = await conversations.listConversationsForHotel(manager.hotelId)

  return hotelConversations.flatMap((conversation) =>
    conversation.messages
      .filter((message) => message.status === 'declined')
      .map((message) => ({
        id: message.id,
        conversation_id: conversation.id,
        stay_id: conversation.stayId,
        event_id: message.eventId,
        question: message.text,
        response: message.reply,
        reason: declineReason(message),
        created_at: message.createdAt.toISOString(),
      }))
  )
}

export type DeclinedRequest = Awaited<ReturnType<typeof listDeclinedRequests>>[number]
export type ConversationView = Awaited<ReturnType<typeof getConversation>>
export type ManagerConversationView = Omit<ConversationView, 'messages'> & {
  messages: ReturnType<typeof managerMessage>[]
}
