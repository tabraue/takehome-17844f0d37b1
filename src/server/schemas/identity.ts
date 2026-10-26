import { z } from 'zod'
import { id } from '@/server/schemas/common'

export const bearerTokenSchema = z
  .string()
  .regex(/^Bearer \S+$/)
  .transform((header) => header.slice('Bearer '.length))

const guestSchema = z
  .object({
    token: id,
    role: z.literal('guest'),
    org_id: id,
    hotel_id: id,
    stay_id: id,
  })
  .transform(({ token, role, org_id, hotel_id, stay_id }) => ({
    token,
    role,
    orgId: org_id,
    hotelId: hotel_id,
    stayId: stay_id,
  }))

const managerSchema = z
  .object({
    token: id,
    role: z.literal('manager'),
    org_id: id,
    hotel_id: id,
    stay_id: z.null(),
  })
  .transform(({ token, role, org_id, hotel_id }) => ({
    token,
    role,
    orgId: org_id,
    hotelId: hotel_id,
    stayId: null,
  }))

export const identitySchema = z.discriminatedUnion('role', [guestSchema, managerSchema])

export const identitiesFileSchema = z.object({
  identities: z.array(identitySchema),
})

export type Identity = z.output<typeof identitySchema>
export type GuestIdentity = Extract<Identity, { role: 'guest' }>
export type ManagerIdentity = Extract<Identity, { role: 'manager' }>
export type Role = Identity['role']
