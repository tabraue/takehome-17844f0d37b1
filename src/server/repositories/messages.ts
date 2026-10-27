import 'server-only'
import { prisma } from '@/server/db'
import type { Prisma } from '@/generated/prisma/client'

export type NewMessage = Omit<Prisma.MessageUncheckedCreateInput, 'proposal' | 'traces'> & {
  proposal?: Prisma.ProposalCreateWithoutMessageInput
}

const includeProposal = { proposal: { select: { id: true } } } as const

export const findOrCreateConversation = (data: Prisma.ConversationCreateInput) =>
  prisma.conversation.upsert({ where: { id: data.id }, create: data, update: {} })

export const findMessage = (conversationId: string, eventId: string) =>
  prisma.message.findUnique({
    where: { conversationId_eventId: { conversationId, eventId } },
    include: includeProposal,
  })

export const saveMessage = ({ proposal, ...message }: NewMessage) =>
  prisma.message.create({
    data: { ...message, ...(proposal && { proposal: { create: proposal } }) },
    include: includeProposal,
  })
