import type { ReactNode } from 'react'

const tones = {
  error:
    'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200',
  ok: 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
  info: 'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200',
}

export function Notice({ tone, children }: { tone: keyof typeof tones; children: ReactNode }) {
  return (
    <p role="status" className={`rounded-md border px-3 py-2 text-sm ${tones[tone]}`}>
      {children}
    </p>
  )
}
