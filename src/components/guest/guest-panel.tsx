import { MessageForm, NewConversationButton } from '@/components/guest/guest-actions'
import { CheckoutChange } from '@/components/ui/checkout-change'
import { Panel } from '@/components/ui/panel'
import { SessionSelect } from '@/components/ui/session-select'
import { StatusBadge } from '@/components/ui/status-badge'
import { HttpError } from '@/server/errors'
import type { GuestIdentity } from '@/server/schemas/identity'
import { getConversation } from '@/server/services/conversations'
import { hrefWith, type Search } from '@/utils/search'
import { sessionLabel } from '@/utils/utils'

interface GuestPanelProps {
  sessions: GuestIdentity[]
  guest: GuestIdentity
  search: Search
}

const findConversation = async (guest: GuestIdentity, conversationId: string) => {
  try {
    return await getConversation(guest, conversationId)
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) return null
    throw error
  }
}

export async function GuestPanel({ sessions, guest, search }: GuestPanelProps) {
  const conversationId = search.chat ? `conv-${guest.token}-${search.chat}` : `conv-${guest.token}`
  const conversation = await findConversation(guest, conversationId)
  const messages = conversation?.messages ?? []

  const options = sessions.map((s) => ({
    token: s.token,
    label: sessionLabel(s),
    href: hrefWith(search, { guest: s.token, chat: null }),
  }))

  return (
    <Panel
      title="Huésped"
      description="Envía mensajes y sigue el estado de la solicitud."
      actions={<SessionSelect options={options} value={guest.token} />}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <span>
            Conversación <code className="font-mono">{conversationId}</code>
          </span>
          <NewConversationButton token={guest.token} search={search} />
        </div>

        {conversation?.status && (
          <div className="flex items-center gap-2 text-sm">
            Estado actual: <StatusBadge status={conversation.status} />
          </div>
        )}

        <ol className="flex min-h-40 flex-col gap-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950">
          {messages.length === 0 && (
            <li className="m-auto text-sm text-zinc-500">
              Todavía no hay mensajes. Prueba con «Mañana quiero salir a las 14:00».
            </li>
          )}
          {messages.map((m) => (
            <li key={m.event_id} className="flex flex-col gap-1.5">
              <p className="max-w-[85%] self-end rounded-2xl rounded-br-sm bg-zinc-900 px-3 py-2 text-sm whitespace-pre-wrap text-white dark:bg-zinc-100 dark:text-zinc-900">
                {m.text}
              </p>
              {m.message && (
                <div className="flex max-w-[85%] flex-col gap-2 self-start rounded-2xl rounded-bl-sm border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <p>{m.message}</p>
                  {m.proposal ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <CheckoutChange proposal={m.proposal} />
                      <StatusBadge status={m.proposal.status} />
                    </div>
                  ) : (
                    m.status && (
                      <div>
                        <StatusBadge status={m.status} />
                      </div>
                    )
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>

        <MessageForm
          key={`${guest.token}:${conversationId}`}
          token={guest.token}
          conversationId={conversationId}
          stayId={guest.stayId}
        />
      </div>
    </Panel>
  )
}
