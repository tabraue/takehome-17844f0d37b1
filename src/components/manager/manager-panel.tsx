import { ManagerActions, ProposalButtons } from '@/components/manager/manager-actions'
import { ProposalFilter } from '@/components/manager/proposal-filter'
import { ProposalDetail } from '@/components/proposal/proposal-detail'
import { CheckoutChange } from '@/components/ui/checkout-change'
import { Panel } from '@/components/ui/panel'
import { SessionSelect } from '@/components/ui/session-select'
import { StatusBadge } from '@/components/ui/status-badge'
import type { ManagerIdentity } from '@/server/schemas/identity'
import { listDeclinedRequests } from '@/server/services/conversations'
import { listProposals } from '@/server/services/proposals'
import { hrefWith, type Search } from '@/utils/search'
import { sessionLabel } from '@/utils/utils'

type Props = { sessions: ManagerIdentity[]; manager: ManagerIdentity; search: Search }

export async function ManagerPanel({ sessions, manager, search }: Props) {
  const [proposals, declinedRequests] = await Promise.all([
    listProposals(manager),
    listDeclinedRequests(manager),
  ])

  const options = sessions.map((s) => ({
    token: s.token,
    label: sessionLabel(s),
    href: hrefWith(search, { manager: s.token }),
  }))

  const items = proposals.map((p) => ({
    id: p.id,
    status: p.status,
    node: (
      <li className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-sm font-medium">{p.stay_id}</span>
          <StatusBadge status={p.status} />
        </div>
        <CheckoutChange proposal={p} />
        <ProposalButtons proposal={{ id: p.id, stay_id: p.stay_id, status: p.status }} />
        <details>
          <summary className="w-fit cursor-pointer text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
            Ver detalle
          </summary>
          <div className="mt-3">
            <ProposalDetail proposal={p} manager={manager} />
          </div>
        </details>
      </li>
    ),
  }))

  return (
    <Panel
      title="Manager"
      description="Propuestas de tu hotel: aprobar, rechazar y comprobar pendientes."
      actions={<SessionSelect options={options} value={manager.token} />}
    >
      <div className="flex flex-col gap-4">
        <ManagerActions key={manager.token} token={manager.token}>
          <ProposalFilter
            items={items}
            declined={<DeclinedRequests requests={declinedRequests} />}
            declinedCount={declinedRequests.length}
          />
        </ManagerActions>
      </div>
    </Panel>
  )
}

function DeclinedRequests({
  requests,
}: {
  requests: Awaited<ReturnType<typeof listDeclinedRequests>>
}) {
  return (
    <section className="flex flex-col gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
      <header className="flex items-baseline justify-between gap-2">
        <div>
          <h3 className="font-medium">Solicitudes declinadas</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Peticiones que la IA no pudo aceptar y el motivo de la decisión.
          </p>
        </div>
        <StatusBadge status="declined" />
      </header>

      {requests.length === 0 ? (
        <p className="rounded-lg bg-zinc-50 p-4 text-center text-sm text-zinc-500 dark:bg-zinc-950">
          No hay solicitudes declinadas.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {requests.map((request) => (
            <li
              key={request.id}
              className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono font-medium">{request.stay_id}</span>
                <code className="text-xs text-zinc-500">{request.event_id}</code>
              </div>
              <p>
                <span className="font-medium">Cliente:</span> {request.question}
              </p>
              <p className="text-zinc-600 dark:text-zinc-300">
                <span className="font-medium text-zinc-900 dark:text-zinc-100">IA:</span>{' '}
                {request.response ?? 'La solicitud fue declinada.'}
              </p>
              {request.reason && (
                <p className="rounded-md bg-rose-50 px-3 py-2 text-rose-900 dark:bg-rose-950 dark:text-rose-200">
                  <span className="font-medium">Motivo:</span> {request.reason.label}{' '}
                  <code className="text-xs opacity-70">({request.reason.code})</code>
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
