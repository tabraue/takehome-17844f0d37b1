'use client'

import { useRouter } from 'next/navigation'
import { useOptimistic, useTransition } from 'react'

type SessionOption = { token: string; label: string; href: string }

interface SessionSelectProps {
  options: SessionOption[]
  value: string
}

export function SessionSelect({ options, value }: SessionSelectProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [selected, setSelected] = useOptimistic(value)

  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
      Sesión
      <select
        value={selected}
        onChange={(event) => {
          const option = options.find((o) => o.token === event.target.value)
          if (!option) return
          startTransition(() => {
            setSelected(option.token)
            router.push(option.href, { scroll: false })
          })
        }}
        className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
      >
        {options.map((option) => (
          <option key={option.token} value={option.token}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
