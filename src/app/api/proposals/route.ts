import { authenticate, requireManager } from '@/server/auth/session'
import { errorResponse } from '@/server/errors'
import { listProposals } from '@/server/services/proposals'

export async function GET(request: Request) {
  try {
    const manager = requireManager(authenticate(request))

    const proposals = await listProposals(manager)

    return Response.json({ proposals })
  } catch (error) {
    return errorResponse(error)
  }
}
