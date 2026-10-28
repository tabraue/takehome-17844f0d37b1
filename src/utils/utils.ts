export const hhmm = (iso: string) => iso.slice(11, 16)

export const sessionLabel = (session: { token: string; stayId: string | null; hotelId: string }) =>
  `${session.token} · ${session.stayId ? `${session.stayId} · ` : ''}${session.hotelId}`
