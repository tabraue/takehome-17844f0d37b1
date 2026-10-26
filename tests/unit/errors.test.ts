import { afterEach, describe, expect, it, vi } from 'vitest'
import { errorResponse, HttpError } from '@/server/errors'

describe('errorResponse', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('Serializes an HttpError with its status and code', async () => {
    const response = errorResponse(new HttpError(403, 'forbidden', 'Nope'))

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ error: { code: 'forbidden', message: 'Nope' } })
  })

  it('Hides unexpected errors behind a generic 500', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})

    const response = errorResponse(new Error('db exploded..'))

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      error: { code: 'internal_error', message: 'Unexpected server error' },
    })
    expect(log).toHaveBeenCalledOnce()
  })
})
