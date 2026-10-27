import 'server-only'
import { prisma } from '@/server/db'

const includeStay = { message: { select: { conversation: { select: { stayId: true } } } } } as const

export const listProposalsForHotel = (hotelId: string) =>
  prisma.proposal.findMany({
    where: { message: { conversation: { hotelId } } },
    include: includeStay,
    orderBy: { createdAt: 'desc' },
  })
export const findProposalForHotel = (id: string, hotelId: string) =>
  prisma.proposal.findFirst({
    where: { id, message: { conversation: { hotelId } } },
    include: includeStay,
  })

export type StoredProposal = NonNullable<Awaited<ReturnType<typeof findProposalForHotel>>>
