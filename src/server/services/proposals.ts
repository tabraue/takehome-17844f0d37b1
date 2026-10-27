import 'server-only'
import {
  applyChange,
  checkAvailability,
  getOperation,
  getStay,
} from '@/server/clients/reservations/client'
import { reservationsTokenFor } from '@/server/clients/reservations/credentials'
import type { ChangeRequest, OperationOutcome } from '@/server/clients/reservations/types'
import { HttpError } from '@/server/errors'
import * as proposals from '@/server/repositories/proposals'
import type { ManagerIdentity } from '@/server/schemas/identity'

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

const reply = (httpStatus: number, proposal: proposals.StoredProposal, message: string) => ({
  httpStatus,
  body: {
    proposal_id: proposal.id,
    status: proposal.status,
    message,
    receipt: proposal.receipt,
  },
})

const changeRequestFor = (proposal: proposals.StoredProposal): ChangeRequest => ({
  stayId: proposal.message.conversation.stayId,
  requestedCheckoutAt: proposal.requestedCheckoutAt,
  expectedVersion: proposal.stayVersion,
  operationKey: proposal.operationKey,
})

type UnresolvedReason = Extract<OperationOutcome, { status: 'unresolved' }>['reason']

const unresolvedMessages: Record<UnresolvedReason, string> = {
  not_found: 'No applied change found for this operation yet; it stays pending verification',
  network_error: 'Could not reach the reservation service; it stays pending verification',
  server_error: 'Reservation service unavailable; it stays pending verification',
  unexpected_response: 'Unexpected reservation service response; it stays pending verification',
  receipt_mismatch: 'Receipt does not match the proposal; it stays pending verification',
}

export const listProposals = async (manager: ManagerIdentity) => {
  const hotelProposals = await proposals.listProposalsForHotel(manager.hotelId)

  const list = hotelProposals.map((proposal) => toView(proposal))

  return list
}

export const approveProposal = async (manager: ManagerIdentity, proposalId: string) => {
  const proposal = await proposals.findProposalForHotel(proposalId, manager.hotelId)

  if (!proposal) {
    throw new HttpError(404, 'not_found', 'Proposal not found')
  }

  if (proposal.status === 'completed') {
    return reply(200, proposal, 'Checkout already updated')
  }

  if (proposal.status === 'pending_verification') {
    return reply(202, proposal, 'Change sent but not confirmed yet')
  }

  if (proposal.status !== 'awaiting_approval') {
    return reply(409, proposal, 'Proposal is not awaiting approval')
  }

  const claimed = await proposals.moveProposal(proposal.id, 'awaiting_approval', {
    status: 'processing',
    approvedBy: manager.token,
    approvedAt: new Date(),
  })

  if (!claimed) {
    throw new HttpError(409, 'proposal_not_executable', 'Proposal is already being processed')
  }

  const token = reservationsTokenFor(manager)
  const stayId = proposal.message.conversation.stayId

  const stay = await getStay(token, stayId)
  const availability = await checkAvailability(token, stayId, proposal.requestedCheckoutAt)

  if (!stay.ok || !availability.ok) {
    const reopened = await proposals.updateProposal(proposal.id, {
      status: 'awaiting_approval',
      approvedBy: null,
      approvedAt: null,
    })

    return reply(503, reopened, 'Could not verify the reservation; nothing was changed')
  }

  const changed =
    stay.data.version !== proposal.stayVersion ||
    stay.data.checkout_at !== proposal.currentCheckoutAt ||
    !availability.data.available

  if (changed) {
    const stale = await proposals.updateProposal(proposal.id, { status: 'stale' })

    return reply(409, stale, 'Reservation changed since the proposal was created')
  }

  const result = await applyChange(token, changeRequestFor(proposal))

  if (result.status === 'applied') {
    const completed = await proposals.updateProposal(proposal.id, {
      status: 'completed',
      receipt: result.receipt,
    })

    return reply(200, completed, 'Checkout updated successfully')
  }

  if (
    result.status === 'rejected' &&
    result.httpStatus === 503 &&
    result.code === 'simulated_rejection'
  ) {
    const reopened = await proposals.updateProposal(proposal.id, {
      status: 'awaiting_approval',
      approvedBy: null,
      approvedAt: null,
    })

    return reply(
      503,
      reopened,
      'Reservation service did not apply the change; approve again to retry'
    )
  }

  if (result.status === 'rejected') {
    const failed = await proposals.updateProposal(proposal.id, { status: 'failed' })

    return reply(409, failed, `Reservation service rejected the change: ${result.code}`)
  }

  const pending = await proposals.updateProposal(proposal.id, { status: 'pending_verification' })

  return reply(202, pending, 'Change sent but not confirmed yet')
}

export const rejectProposal = async (manager: ManagerIdentity, proposalId: string) => {
  const proposal = await proposals.findProposalForHotel(proposalId, manager.hotelId)

  if (!proposal) {
    throw new HttpError(404, 'not_found', 'Proposal not found')
  }

  if (proposal.status === 'rejected') {
    return reply(200, proposal, 'Proposal already rejected')
  }

  const moved = await proposals.moveProposal(proposal.id, 'awaiting_approval', {
    status: 'rejected',
  })

  if (!moved) {
    return reply(409, proposal, 'Proposal is being executed or already finished')
  }

  return reply(200, { ...proposal, status: 'rejected' }, 'Proposal rejected')
}

export const reconcileProposal = async (manager: ManagerIdentity, proposalId: string) => {
  const proposal = await proposals.findProposalForHotel(proposalId, manager.hotelId)

  if (!proposal) {
    throw new HttpError(404, 'not_found', 'Proposal not found')
  }

  if (proposal.status === 'completed') {
    return reply(200, proposal, 'Checkout already updated')
  }

  if (proposal.status === 'processing') {
    return reply(202, proposal, 'Approval is still being processed')
  }

  if (proposal.status !== 'pending_verification') {
    return reply(200, proposal, 'No change pending verification')
  }

  const outcome = await getOperation(reservationsTokenFor(manager), changeRequestFor(proposal))

  if (outcome.status === 'applied') {
    const completed = await proposals.updateProposal(proposal.id, {
      status: 'completed',
      receipt: outcome.receipt,
    })

    return reply(200, completed, 'Checkout updated successfully')
  }

  return reply(202, proposal, unresolvedMessages[outcome.reason])
}
