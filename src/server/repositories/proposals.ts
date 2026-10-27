import 'server-only'
import { prisma } from '@/server/db'
import { ProposalStatus } from '@/generated/prisma/enums'
import { Prisma } from '@/generated/prisma/client'

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

export const moveProposal = async (
  id: string,
  from: ProposalStatus,
  data: Prisma.ProposalUpdateManyMutationInput
) => {
  const { count } = await prisma.proposal.updateMany({ where: { id, status: from }, data })
  return count === 1
}

export const updateProposal = (id: string, data: Prisma.ProposalUpdateInput) =>
  prisma.proposal.update({ where: { id }, data, include: includeStay })
