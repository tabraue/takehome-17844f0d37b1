import { describe, expect, it, vi } from 'vitest'

const { reservationsTokenFor } = await import('@/server/clients/reservations/credentials')
const { findIdentityByToken } = await import('@/server/auth/identities')

vi.mock('@/server/env', () => ({
  env: {
    RESERVATIONS_GUEST_A1_TOKEN: 'remote-guest-a1',
    RESERVATIONS_GUEST_A2_TOKEN: 'remote-guest-a2',
    RESERVATIONS_GUEST_B1_TOKEN: 'remote-guest-b1',
    RESERVATIONS_MANAGER_A_TOKEN: 'remote-manager-a',
    RESERVATIONS_MANAGER_B_TOKEN: 'remote-manager-b',
  },
}))

describe('reservationsTokenFor', () => {
  it.each([
    ['guest-a1', 'remote-guest-a1'],
    ['manager-b', 'remote-manager-b'],
  ])('Maps session %s to its remote credential', (session, expected) => {
    expect(reservationsTokenFor(findIdentityByToken(session)!)).toBe(expected)
  })

  it('Throws for a session without credential', () => {
    const identity = { ...findIdentityByToken('guest-a1')!, token: 'ghost' }
    expect(() => reservationsTokenFor(identity)).toThrow(/No reservations credential configured/)
  })
})
