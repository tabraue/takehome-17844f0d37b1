import 'server-only'
import type { Prisma } from '@/generated/prisma/client'
import { interpretMessage } from '@/server/clients/llm/client'
import { checkAvailability, getStay } from '@/server/clients/reservations/client'
import { reservationsTokenFor } from '@/server/clients/reservations/credentials'
import { listDocuments } from '@/server/documents'
import { evaluateRequest, selectPolicy } from '@/server/domain/policy'
import { HttpError } from '@/server/errors'
import * as messages from '@/server/repositories/messages'
import type { GuestIdentity } from '@/server/schemas/identity'
import type { MessageRequest } from '@/server/schemas/messages'
import { replyFor, type ReplyInput } from '@/server/services/replies'

type Decision = ReplyInput & { proposal?: Prisma.ProposalCreateWithoutMessageInput }
type StoredMessage = NonNullable<Awaited<ReturnType<typeof messages.findMessage>>>

const notFound = () => new HttpError(404, 'not_found', 'Conversation or stay not found')

const decide = async (guest: GuestIdentity, text: string): Promise<Decision> => {
  const interpreted = await interpretMessage([{ role: 'user', content: text }])

  if (!interpreted.ok) return { status: 'handoff' }

  const { requested_time, language } = interpreted.interpretation

  const token = reservationsTokenFor(guest)

  const stay = await getStay(token, guest.stayId)

  const policyDocs = listDocuments()

  const selection = selectPolicy(policyDocs, { orgId: guest.orgId, hotelId: guest.hotelId })
  if (!stay.ok || !selection.ok) {
    return { status: 'handoff', language }
  }

  const { rules, evidence } = selection.policy
  const evaluation = evaluateRequest(stay.data.checkout_at, requested_time, rules)
  const base = {
    language,
    current: evaluation.currentCheckoutAt.slice(11, 16),
    requested: requested_time,
  }
  if (evaluation.kind !== 'proposal') return { ...base, status: evaluation.kind }

  const availability = await checkAvailability(token, guest.stayId, evaluation.requestedCheckoutAt)

  if (!availability.ok) return { status: 'handoff', language }
  if (!availability.data.available) return { ...base, status: 'declined' }

  return {
    ...base,
    status: 'awaiting_approval',
    fee: evaluation.feeEur,
    proposal: {
      stayVersion: availability.data.stay_version,
      currentCheckoutAt: evaluation.currentCheckoutAt,
      requestedCheckoutAt: evaluation.requestedCheckoutAt,
      feeEur: evaluation.feeEur,
      policyDocumentId: evidence.documentId,
      policyVersion: evidence.version,
      policyQuote: evidence.quote,
    },
  }
}

const toResponse = (body: MessageRequest, message: StoredMessage, replayed: boolean) => ({
  event_id: body.event_id,
  conversation_id: body.conversation_id,
  status: message.status,
  message: message.reply,
  proposal_id: message.proposal?.id ?? null,
  trace_id: message.id,
  replayed,
})

export const handleMessage = async (guest: GuestIdentity, body: MessageRequest) => {
  if (body.stay_id !== guest.stayId) throw notFound()

  const conversation = await messages.findOrCreateConversation({
    id: body.conversation_id,
    ownerId: guest.token,
    hotelId: guest.hotelId,
    stayId: guest.stayId,
  })

  if (conversation.ownerId !== guest.token) throw notFound()

  const existing = await messages.findMessage(conversation.id, body.event_id)

  if (existing) {
    if (existing.text !== body.text) {
      throw new HttpError(409, 'event_conflict', 'This event_id was already used with another text')
    }
    return toResponse(body, existing, true)
  }

  const decision = await decide(guest, body.text)

  const saved = await messages.saveMessage({
    conversationId: conversation.id,
    eventId: body.event_id,
    text: body.text,
    status: decision.status,
    reply: replyFor(decision),
    ...(decision.proposal && { proposal: { create: decision.proposal } }),
  })

  return toResponse(body, saved, false)
}
