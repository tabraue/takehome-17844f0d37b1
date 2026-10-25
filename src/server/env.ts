import 'server-only'
import { z } from 'zod'

const secret = z.string().min(1)

const schema = z.object({
  DATABASE_URL: z.string().min(1),

  RESERVATIONS_BASE_URL: z.url(),
  RESERVATIONS_SCENARIO: z.enum(['normal', 'transient-503', 'response-lost', 'stale-availability']),
  RESERVATIONS_GUEST_A1_TOKEN: secret,
  RESERVATIONS_GUEST_A2_TOKEN: secret,
  RESERVATIONS_GUEST_B1_TOKEN: secret,
  RESERVATIONS_MANAGER_A_TOKEN: secret,
  RESERVATIONS_MANAGER_B_TOKEN: secret,
  RESERVATIONS_TESTER_TOKEN: secret,

  LLM_BASE_URL: z.url(),
  LLM_MODEL: z.string().min(1),
  LLM_SCENARIO: z.enum([
    'normal',
    'malformed-json',
    'invalid-time',
    'privilege-fields',
    'transient-503',
  ]),
  LLM_API_KEY: secret,
  LLM_TESTER_TOKEN: secret,
})

export const env = schema.parse(process.env)
