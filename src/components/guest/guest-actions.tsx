'use client'

import { useRouter } from 'next/navigation'
import { type SubmitEvent, useState, useTransition } from 'react'
import { buttonClass } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { hrefWith, type Search } from '@/utils/search'
import { sendMessage } from '@/client/api'

interface MessageFormProps {
  token: string
  conversationId: string
  stayId: string
}

export function MessageForm({ token, conversationId, stayId }: MessageFormProps) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<{ eventId: string; text: string } | null>(null)
  const [sending, startTransition] = useTransition()

  const send = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || sending) return

    const eventId = pending?.text === trimmed ? pending.eventId : crypto.randomUUID()
    setPending({ eventId, text: trimmed })

    startTransition(async () => {
      const res = await sendMessage(token, {
        event_id: eventId,
        conversation_id: conversationId,
        stay_id: stayId,
        text: trimmed,
      })

      startTransition(() => {
        if (!res.ok) {
          setError(res.message ?? `HTTP ${res.status}`)
          return
        }
        setText('')
        setPending(null)
        setError(null)
        router.refresh()
      })
    })
  }

  return (
    <>
      <form onSubmit={send} className="flex flex-col gap-2 sm:flex-row">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Escribe tu mensaje"
          aria-label="Mensaje"
          maxLength={8000}
          disabled={sending}
          className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
        <button type="submit" disabled={sending || !text.trim()} className={buttonClass.primary}>
          {sending ? 'Enviando…' : 'Enviar'}
        </button>
      </form>

      {error && <Notice tone="error">{error}</Notice>}
    </>
  )
}

export function NewConversationButton({ token, search }: { token: string; search: Search }) {
  const router = useRouter()

  const start = () => {
    const chat = crypto.randomUUID().slice(0, 8)
    router.push(hrefWith(search, { guest: token, chat }), { scroll: false })
  }

  return (
    <button type="button" onClick={start} className={buttonClass.secondary}>
      Nueva conversación
    </button>
  )
}
