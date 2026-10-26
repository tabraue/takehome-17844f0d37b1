import 'server-only'
import { env } from '@/server/env'
import type { Identity } from '@/server/schemas/identity'

const reservationsTokens = new Map<string, string>([
  ['guest-a1', env.RESERVATIONS_GUEST_A1_TOKEN],
  ['guest-a2', env.RESERVATIONS_GUEST_A2_TOKEN],
  ['guest-b1', env.RESERVATIONS_GUEST_B1_TOKEN],
  ['manager-a', env.RESERVATIONS_MANAGER_A_TOKEN],
  ['manager-b', env.RESERVATIONS_MANAGER_B_TOKEN],
])

export const reservationsTokenFor = (identity: Identity): string => {
  const token = reservationsTokens.get(identity.token)
  if (!token) {
    throw new Error('No reservations credential configured')
  }
  return token
}
