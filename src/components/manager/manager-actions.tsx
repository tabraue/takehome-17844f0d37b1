'use client'

import { useRouter } from 'next/navigation'
import { createContext, type ReactNode, use, useState, useTransition } from 'react'
import { buttonClass } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import type { Proposal } from '@/types/types'
import { actOnProposal, type ProposalAction } from '@/client/api'

type Target = Pick<Proposal, 'id' | 'stay_id' | 'status'>

const actionLabels: Record<ProposalAction, string> = {
  approve: 'Aprobar',
  reject: 'Rechazar',
  reconcile: 'Comprobar',
}

const ActionsContext = createContext<{
  busyId: string | null
  act: (proposal: Target, action: ProposalAction) => void
} | null>(null)

export function ManagerActions({ token, children }: { token: string; children: ReactNode }) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ status: number; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  const act = (proposal: Target, action: ProposalAction) => {
    setBusyId(proposal.id)

    startTransition(async () => {
      const res = await actOnProposal(token, proposal.id, action)

      startTransition(() => {
        setNotice({
          status: res.status,
          text: `${actionLabels[action]} ${proposal.stay_id}: ${res.message ?? 'sin respuesta'}`,
        })
        router.refresh()
      })
    })
  }

  return (
    <ActionsContext value={{ busyId: pending ? busyId : null, act }}>
      {notice && (
        <Notice tone={notice.status === 200 ? 'ok' : notice.status === 202 ? 'info' : 'error'}>
          {notice.text} <span className="opacity-60">(HTTP {notice.status})</span>
        </Notice>
      )}
      {children}
    </ActionsContext>
  )
}

export function ProposalButtons({ proposal }: { proposal: Target }) {
  const actions = use(ActionsContext)
  if (!actions) throw new Error('ProposalButtons must be rendered inside ManagerActions')

  const { busyId, act } = actions
  const awaiting = proposal.status === 'awaiting_approval'
  const uncertain = proposal.status === 'processing' || proposal.status === 'pending_verification'
  if (!awaiting && !uncertain) return null

  return (
    <div className="flex flex-wrap gap-2">
      {awaiting && (
        <>
          <button
            type="button"
            disabled={busyId !== null}
            onClick={() => act(proposal, 'approve')}
            className={buttonClass.primary}
          >
            {busyId === proposal.id ? 'Procesando…' : 'Aprobar'}
          </button>
          <button
            type="button"
            disabled={busyId !== null}
            onClick={() => act(proposal, 'reject')}
            className={buttonClass.danger}
          >
            Rechazar
          </button>
        </>
      )}
      {uncertain && (
        <button
          type="button"
          disabled={busyId !== null}
          onClick={() => act(proposal, 'reconcile')}
          className={buttonClass.primary}
        >
          {busyId === proposal.id ? 'Comprobando…' : 'Comprobar'}
        </button>
      )}
    </div>
  )
}
