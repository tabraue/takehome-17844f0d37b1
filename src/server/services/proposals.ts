import 'server-only'
import type { ManagerIdentity } from '@/server/schemas/identity'
import * as proposals from '@/server/repositories/proposals'

const toView = (p: proposals.StoredProposal) => ({
  id: p.id,
  stay_id: p.message.conversation.stayId,
  status: p.status,
  current_checkout_at: p.currentCheckoutAt,
  requested_checkout_at: p.requestedCheckoutAt,
  fee_eur: p.feeEur,
  policy_document_id: p.policyDocumentId,
  policy_version: p.policyVersion,
  evidence: { document_id: p.policyDocumentId, version: p.policyVersion, quote: p.policyQuote },
  operation_key: p.operationKey,
  receipt: p.receipt,
})

export const listProposals = async (manager: ManagerIdentity) => {
  const hotelProposals = await proposals.listProposalsForHotel(manager.hotelId)

  const list = hotelProposals.map((proposal) => toView(proposal))

  return list
}
