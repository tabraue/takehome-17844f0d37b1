import { authenticate, requireManager } from '@/server/auth/session'
import { errorResponse, HttpError } from '@/server/errors'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const manager = requireManager(authenticate(request))
    const { id } = await params
    // TODO: implement reject proposal
    throw new HttpError(501, 'not_implemented', 'Not implemented yet')
  } catch (error) {
    return errorResponse(error)
  }
}
