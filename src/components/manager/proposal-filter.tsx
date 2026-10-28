'use client'

import { Fragment, type ReactNode, useState } from 'react'
import { declinedGroup, inProposalGroup, proposalGroups } from '@/domain/proposals/status'
import type { ProposalStatus } from '@/types/types'

type Item = { id: string; status: ProposalStatus; node: ReactNode }

interface ProposalFilterProps {
  items: Item[]
  declined: ReactNode
  declinedCount: number
}

export function ProposalFilter({ items, declined, declinedCount }: ProposalFilterProps) {
  const [filter, setFilter] = useState<string | null>(null)
  const group = proposalGroups.find((g) => g.id === filter)
  const showingDeclined = filter === declinedGroup.id
  const visible = group ? items.filter((i) => inProposalGroup(group, i.status)) : items

  return (
    <>
      <nav className="flex flex-wrap gap-2" aria-label="Filtrar por estado">
        <FilterChip active={filter === null} onClick={() => setFilter(null)}>
          Todas ({items.length})
        </FilterChip>
        {proposalGroups.map((g) => (
          <FilterChip key={g.id} active={g === group} onClick={() => setFilter(g.id)}>
            {g.label} ({items.filter((i) => inProposalGroup(g, i.status)).length})
          </FilterChip>
        ))}
        <FilterChip active={showingDeclined} onClick={() => setFilter(declinedGroup.id)}>
          {declinedGroup.label} ({declinedCount})
        </FilterChip>
      </nav>

      {showingDeclined ? (
        declined
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.length === 0 && (
            <li className="rounded-lg bg-zinc-50 p-4 text-center text-sm text-zinc-500 dark:bg-zinc-950">
              No hay propuestas{group ? ' en este estado' : ' de tu hotel'}.
            </li>
          )}
          {visible.map((i) => (
            <Fragment key={i.id}>{i.node}</Fragment>
          ))}
        </ul>
      )}
    </>
  )
}

function FilterChip(props: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      aria-pressed={props.active}
      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
        props.active
          ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
          : 'border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800'
      }`}
    >
      {props.children}
    </button>
  )
}
