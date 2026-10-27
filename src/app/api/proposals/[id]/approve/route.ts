import { authenticate, requireManager } from '@/server/auth/session'
import { errorResponse } from '@/server/errors'
import { approveProposal } from '@/server/services/proposals'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const manager = requireManager(authenticate(request))
    const { id } = await params

    const { httpStatus, body } = await approveProposal(manager, id)
    return Response.json(body, { status: httpStatus })
  } catch (error) {
    return errorResponse(error)
  }
}
