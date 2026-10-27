import 'server-only'
import { prisma } from '@/server/db'
import type { Prisma } from '@/generated/prisma/client'

export type TraceInput = Omit<
  Prisma.TraceCreateManyInput,
  'id' | 'messageId' | 'proposalId' | 'createdAt' | 'updatedAt'
>

export const saveTraces = (
  owner: { messageId?: string; proposalId?: string | null },
  traces: TraceInput[]
) => prisma.trace.createMany({ data: traces.map((trace) => ({ ...trace, ...owner })) })
