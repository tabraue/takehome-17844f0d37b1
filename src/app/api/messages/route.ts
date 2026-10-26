import { authenticate, requireGuest } from '@/server/auth/session'
import { errorResponse, HttpError } from '@/server/errors'
import { messageRequestSchema } from '@/server/schemas/messages'

export async function POST(request: Request) {
  try {
    const guest = requireGuest(authenticate(request))

    const body = messageRequestSchema.safeParse(await request.json().catch(() => null))
    if (!body.success) {
      throw new HttpError(422, 'invalid_body', 'Invalid body')
    }

    // TODO: ongoing -> handle message
    return Response.json({ ok: true, guest: guest.token, body: body.data })
  } catch (error) {
    return errorResponse(error)
  }
}
