import 'server-only'
import { prisma } from '@/server/db'

export type ConversationScope = { ownerId: string } | { hotelId: string }

export const findConversation = (id: string, scope: ConversationScope) =>
  prisma.conversation.findFirst({
    where: { id, ...scope },
    include: {
      messages: {
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        include: { proposal: true, traces: { orderBy: { createdAt: 'asc' } } },
      },
    },
  })

export type StoredConversation = NonNullable<Awaited<ReturnType<typeof findConversation>>>
