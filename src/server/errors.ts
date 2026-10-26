import 'server-only'

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options)
    this.name = 'HttpError'
  }
}

export const errorResponse = (error: unknown): Response => {
  if (error instanceof HttpError) {
    if (error.cause !== undefined) console.error(error)
    return Response.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status }
    )
  }

  console.error(error)
  return Response.json(
    { error: { code: 'internal_error', message: 'Unexpected server error' } },
    { status: 500 }
  )
}
