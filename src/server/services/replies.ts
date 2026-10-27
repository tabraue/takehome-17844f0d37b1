import type { ReplyStatus } from '@/generated/prisma/client'
import type { Interpretation } from '@/server/schemas/llm'

export type ReplyInput = {
  status: ReplyStatus
  language?: Interpretation['language']
  current?: string
  requested?: string | null
  fee?: number
}

const REPLIES = {
  es: {
    needs_input: ({ current }) =>
      `¿A qué hora quieres salir? Tu salida actual es a las ${current}.`,
    information: ({ current }) =>
      `Tu salida ya está a las ${current}. No hace falta ningún cambio.`,
    declined: ({ requested, current }) =>
      `No es posible salir a las ${requested}. Tu salida sigue a las ${current}.`,
    awaiting_approval: ({ requested, fee }) =>
      `La solicitud de salida a las ${requested}, con importe de ${fee} EUR, está pendiente de aprobación.`,
    handoff: () => 'No puedo gestionar tu solicitud ahora. No se ha hecho ningún cambio.',
  },
  en: {
    needs_input: ({ current }) =>
      `What time would you like to check out? Your current check-out is at ${current}.`,
    information: ({ current }) => `Your check-out is already at ${current}. No change is needed.`,
    declined: ({ requested, current }) =>
      `Checking out at ${requested} is not possible. Your check-out remains at ${current}.`,
    awaiting_approval: ({ requested, fee }) =>
      `Your request to check out at ${requested}, with a fee of ${fee} EUR, is pending approval.`,
    handoff: () => "I can't handle your request right now. No change has been made.",
  },
} satisfies Record<'es' | 'en', Record<ReplyStatus, (input: ReplyInput) => string>>

export const replyFor = (input: ReplyInput) => REPLIES[input.language ?? 'es'][input.status](input)
