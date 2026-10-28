import type { ReactNode } from 'react'

export function Panel(props: {
  title: string
  description: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{props.title}</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{props.description}</p>
        </div>
        {props.actions}
      </header>
      {props.children}
    </section>
  )
}
