import { authenticate, requireManager } from '@/server/auth/session'
import { errorResponse, HttpError } from '@/server/errors'

export async function GET(request: Request) {
  try {
    requireManager(authenticate(request))
    // TODO: implement list proposals
    throw new HttpError(501, 'not_implemented', 'Not implemented yet')
  } catch (error) {
    return errorResponse(error)
  }
}
