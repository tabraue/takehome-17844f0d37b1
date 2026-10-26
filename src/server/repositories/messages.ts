import 'server-only'
import { prisma } from '@/server/db'
import type { Prisma } from '@/generated/prisma/client'

const includeProposal = { proposal: { select: { id: true } } } as const

export const findOrCreateConversation = (data: Prisma.ConversationCreateInput) =>
  prisma.conversation.upsert({ where: { id: data.id }, create: data, update: {} })

export const findMessage = (conversationId: string, eventId: string) =>
  prisma.message.findUnique({
    where: { conversationId_eventId: { conversationId, eventId } },
    include: includeProposal,
  })

export const saveMessage = (data: Prisma.MessageUncheckedCreateInput) =>
  prisma.message.create({ data, include: includeProposal })
