import type { ProposalStatus, ReplyStatus } from '@/types/types'

export type StatusTone = 'amber' | 'sky' | 'green' | 'zinc' | 'red' | 'violet'

export type ProposalGroup = {
  id: string
  label: string
  tone: StatusTone
  statuses: ProposalStatus[]
}

export const proposalGroups = [
  {
    id: 'awaiting',
    label: 'Pendiente de aprobación',
    tone: 'amber',
    statuses: ['awaiting_approval'],
  },
  {
    id: 'unverified',
    label: 'Cambio sin comprobar',
    tone: 'sky',
    statuses: ['processing', 'pending_verification'],
  },
  { id: 'completed', label: 'Completado', tone: 'green', statuses: ['completed'] },
  { id: 'rejected', label: 'Rechazado', tone: 'zinc', statuses: ['rejected'] },
  { id: 'review', label: 'Debe revisarse', tone: 'red', statuses: ['stale', 'failed'] },
] as const satisfies readonly ProposalGroup[]

export const declinedGroup = {
  id: 'declined',
  label: 'Declinadas',
  tone: 'zinc' as const,
}

export const inProposalGroup = (group: ProposalGroup, status: ProposalStatus) =>
  group.statuses.includes(status)

const replyLabels: Record<ReplyStatus, { label: string; tone: StatusTone }> = {
  needs_input: { label: 'Falta la hora', tone: 'violet' },
  information: { label: 'Información', tone: 'zinc' },
  awaiting_approval: { label: 'Pendiente de aprobación', tone: 'amber' },
  declined: { label: 'No es posible', tone: 'zinc' },
  handoff: { label: 'Revisión humana', tone: 'red' },
}

export const statusLabel = (status: ProposalStatus | ReplyStatus) => {
  const group = proposalGroups.find((group) =>
    group.statuses.some((candidate) => candidate === (status as ProposalStatus))
  )
  return group ?? replyLabels[status as ReplyStatus]
}
