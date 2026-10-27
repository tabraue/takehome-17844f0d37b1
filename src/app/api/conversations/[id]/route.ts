import { authenticate } from '@/server/auth/session'
import { errorResponse } from '@/server/errors'
import { getConversation } from '@/server/services/conversations'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const identity = authenticate(request)
    const { id } = await params

    const conversations = await getConversation(identity, id)

    return Response.json(conversations)
  } catch (error) {
    return errorResponse(error)
  }
}
