import type { ProposalStatus, ReplyStatus } from '@/types/types'
import { statusLabel, type StatusTone } from '@/domain/proposals/status'

const tones: Record<StatusTone, string> = {
  amber: 'bg-amber-100 text-amber-900 ring-amber-300 dark:bg-amber-950 dark:text-amber-200',
  sky: 'bg-sky-100 text-sky-900 ring-sky-300 dark:bg-sky-950 dark:text-sky-200',
  green:
    'bg-emerald-100 text-emerald-900 ring-emerald-300 dark:bg-emerald-950 dark:text-emerald-200',
  zinc: 'bg-zinc-100 text-zinc-700 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-200',
  red: 'bg-rose-100 text-rose-900 ring-rose-300 dark:bg-rose-950 dark:text-rose-200',
  violet: 'bg-violet-100 text-violet-900 ring-violet-300 dark:bg-violet-950 dark:text-violet-200',
}

export function StatusBadge({ status }: { status: ProposalStatus | ReplyStatus }) {
  const { label, tone } = statusLabel(status)

  return (
    <span
      title={status}
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone]}`}
    >
      {label}
      <code className="font-mono text-[10px] opacity-60">{status}</code>
    </span>
  )
}
