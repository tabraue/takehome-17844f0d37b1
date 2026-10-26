import { describe, expect, it } from 'vitest'
import { bearerTokenSchema, identitySchema } from '@/server/schemas/identity'

describe('bearerTokenSchema:', () => {
  it('Strips the Bearer prefix', () => {
    expect(bearerTokenSchema.parse('Bearer abc-123')).toBe('abc-123')
  })

  it.each([null, '', 'Bearer', 'Bearer a b', 'Basic abc'])('Rejects %j', (value) => {
    expect(bearerTokenSchema.safeParse(value).success).toBe(false)
  })
})

describe('identitySchema:', () => {
  const guest = { token: 't', role: 'guest', org_id: 'o', hotel_id: 'h', stay_id: 's' }
  const manager = { token: 't', role: 'manager', org_id: 'o', hotel_id: 'h', stay_id: null }

  it('Maps snake_case fields to camelCase', () => {
    expect(identitySchema.parse(guest)).toEqual({
      token: 't',
      role: 'guest',
      orgId: 'o',
      hotelId: 'h',
      stayId: 's',
    })
    expect(identitySchema.parse(manager)).toMatchObject({ role: 'manager', stayId: null })
  })

  it('Requires a stay for guests', () => {
    expect(identitySchema.safeParse({ ...guest, stay_id: null }).success).toBe(false)
  })

  it('Forbids a stay for managers', () => {
    expect(identitySchema.safeParse({ ...manager, stay_id: 's' }).success).toBe(false)
  })

  it('Rejects unknown roles and empty ids', () => {
    expect(identitySchema.safeParse({ ...guest, role: 'admin' }).success).toBe(false)
    expect(identitySchema.safeParse({ ...guest, org_id: '' }).success).toBe(false)
  })
})
