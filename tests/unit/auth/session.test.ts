import { describe, expect, it } from 'vitest'
import { authenticate, requireGuest, requireManager } from '@/server/auth/session'
import { HttpError } from '@/server/errors'

const requestWith = (authorization?: string) =>
  new Request('http://localhost/api', {
    headers: authorization === undefined ? {} : { authorization },
  })

const expectHttpError = (fn: () => unknown, status: number, code: string) => {
  try {
    fn()
  } catch (error) {
    expect(error).toBeInstanceOf(HttpError)
    expect(error).toMatchObject({ status, code })
    return
  }
  throw new Error('Expected a function to throw an HttpError')
}

describe('authenticate', () => {
  it('Rejects a request without Authorization header', () => {
    expectHttpError(() => authenticate(requestWith()), 401, 'unauthorized')
  })

  it.each([
    'Token guest-a1',
    'Bearer',
    'Bearer ',
    'Bearer  guest-a1',
    'bearer guest-a1',
    'guest-a1',
  ])('Rejects malformed header %j', (header) => {
    expectHttpError(() => authenticate(requestWith(header)), 401, 'unauthorized')
  })

  it('Rejects an unknown token', () => {
    expectHttpError(() => authenticate(requestWith('Bearer nope')), 401, 'unauthorized')
  })

  it('Returns the guest identity for a guest token', () => {
    expect(authenticate(requestWith('Bearer guest-a1'))).toEqual({
      token: 'guest-a1',
      role: 'guest',
      orgId: 'org-coral',
      hotelId: 'hotel-alba',
      stayId: 'STAY-A1',
    })
  })

  it('Returns the manager identity for a manager token', () => {
    expect(authenticate(requestWith('Bearer manager-b'))).toEqual({
      token: 'manager-b',
      role: 'manager',
      orgId: 'org-brisa',
      hotelId: 'hotel-alba-b',
      stayId: null,
    })
  })
})

describe('role guards', () => {
  const guest = authenticate(requestWith('Bearer guest-a1'))
  const manager = authenticate(requestWith('Bearer manager-a'))

  it('requireGuest accepts a guest and rejects a manager', () => {
    expect(requireGuest(guest)).toBe(guest)
    expectHttpError(() => requireGuest(manager), 403, 'forbidden')
  })

  it('requireManager accepts a manager and rejects a guest', () => {
    expect(requireManager(manager)).toBe(manager)
    expectHttpError(() => requireManager(guest), 403, 'forbidden')
  })
})
