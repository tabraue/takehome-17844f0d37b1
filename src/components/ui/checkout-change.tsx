import type { Proposal } from '@/types/types'
import { hhmm } from '@/utils/utils'

export function CheckoutChange({
  proposal,
}: {
  proposal: Pick<Proposal, 'current_checkout_at' | 'requested_checkout_at' | 'fee_eur'>
}) {
  return (
    <span className="text-sm">
      Salida {hhmm(proposal.current_checkout_at)} →{' '}
      <strong>{hhmm(proposal.requested_checkout_at)}</strong> · {proposal.fee_eur} EUR
    </span>
  )
}
