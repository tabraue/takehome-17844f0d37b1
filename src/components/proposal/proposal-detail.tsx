import type { ReactNode } from 'react'
import type { ManagerIdentity } from '@/server/schemas/identity'
import { getConversation } from '@/server/services/conversations'
import type { ManagerConversation, Proposal } from '@/types/types'
import { hhmm } from '@/utils/utils'

type Props = { proposal: Proposal; manager: ManagerIdentity }

// Manager-only detail: the policy document behind the proposal and the operation log
export async function ProposalDetail({ proposal, manager }: Props) {
  // the proposal comes from this manager's hotel list, so its conversation is always in scope;
  // a manager identity gets the manager view of the messages
  const conversation = (await getConversation(
    manager,
    proposal.conversation_id
  )) as ManagerConversation

  const origin = conversation.messages.find((m) => m.proposal?.id === proposal.id)
  const { evidence, receipt } = proposal

  return (
    <div className="flex flex-col gap-4 border-t border-zinc-200 pt-3 text-sm dark:border-zinc-800">
      <DetailSection title="Documento">
        <p>
          <code className="font-mono">{evidence.document_id}</code> · versión {evidence.version}
        </p>
        <blockquote className="border-l-2 border-zinc-300 pl-3 text-zinc-600 italic dark:border-zinc-700 dark:text-zinc-300">
          {evidence.quote}
        </blockquote>
      </DetailSection>

      <DetailSection title="Operación">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <dt className="text-zinc-500">operation_key</dt>
          <dd className="font-mono break-all">{proposal.operation_key}</dd>
          <dt className="text-zinc-500">Recibo</dt>
          <dd>
            {receipt ? (
              <>
                <span className="font-mono">{receipt.change_id}</span> · salida{' '}
                {hhmm(receipt.checkout_at)} · versión {receipt.version}
              </>
            ) : (
              'Sin recibo comprobado'
            )}
          </dd>
        </dl>
      </DetailSection>

      <DetailSection title="Registro">
        {origin && (
          <p className="text-zinc-600 dark:text-zinc-300">
            Mensaje <code className="font-mono">{origin.event_id}</code>: «{origin.text}»
            {origin.trace_id && (
              <>
                {' '}
                · trace_id <code className="font-mono">{origin.trace_id}</code>
              </>
            )}
          </p>
        )}
        {origin?.traces && origin.traces.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-zinc-500">
                <tr>
                  <th className="py-1 pr-3 font-medium">Paso</th>
                  <th className="py-1 pr-3 font-medium">Resultado</th>
                  <th className="py-1 pr-3 font-medium">Duración</th>
                  <th className="py-1 pr-3 font-medium whitespace-nowrap">Petición remota</th>
                  <th className="py-1 font-medium whitespace-nowrap">Tokens (simulados)</th>
                </tr>
              </thead>
              <tbody className="font-mono whitespace-nowrap">
                {origin.traces.map((t, index) => (
                  <tr key={index} className="border-t border-zinc-100 dark:border-zinc-800">
                    <td className="py-1 pr-3">{t.step}</td>
                    <td
                      className={`py-1 pr-3 ${t.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}
                    >
                      {t.ok ? 'ok' : (t.error ?? 'error')}
                    </td>
                    <td className="py-1 pr-3">{t.duration_ms} ms</td>
                    <td className="py-1 pr-3" title={t.remote_request_id ?? undefined}>
                      {t.remote_request_id ? `${t.remote_request_id.slice(0, 8)}…` : '—'}
                    </td>
                    <td className="py-1">
                      {t.simulated_prompt_tokens === null
                        ? '—'
                        : `${t.simulated_prompt_tokens} + ${t.simulated_completion_tokens}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DetailSection>
    </div>
  )
}

function DetailSection(props: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">{props.title}</h3>
      {props.children}
    </section>
  )
}
