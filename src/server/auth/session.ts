import 'server-only'
import { HttpError } from '@/server/errors'
import {
  bearerTokenSchema,
  type GuestIdentity,
  type Identity,
  type ManagerIdentity,
} from '@/server/schemas/identity'
import { findIdentityByToken } from '@/server/auth/identities'

export const authenticate = (request: Request): Identity => {
  const token = bearerTokenSchema.safeParse(request.headers.get('authorization'))

  if (!token.success) {
    throw new HttpError(401, 'unauthorized', 'Missing or malformed Authorization header')
  }

  const identity = findIdentityByToken(token.data)

  if (!identity) {
    throw new HttpError(401, 'unauthorized', 'Invalid session token')
  }

  return identity
}

export const requireGuest = (identity: Identity): GuestIdentity => {
  if (identity.role !== 'guest') {
    throw new HttpError(403, 'forbidden', 'This action requires a guest session')
  }
  return identity
}

export const requireManager = (identity: Identity): ManagerIdentity => {
  if (identity.role !== 'manager') {
    throw new HttpError(403, 'forbidden', 'This action requires a manager session')
  }
  return identity
}
