'use client'

import type { MessageRequest, ProposalActionResponse } from '@/types/types'

export type ApiResponse<T> = {
  ok: boolean
  status: number
  body: T | null
  message: string | null
}

export type ProposalAction = 'approve' | 'reject' | 'reconcile'

async function callApi<T>(
  token: string,
  path: string,
  init: { method?: 'GET' | 'POST'; body?: unknown } = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(path, {
      method: init.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.body !== undefined && { 'Content-Type': 'application/json' }),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: 'no-store',
    })
    const json = await response.json().catch(() => null)

    return {
      ok: response.ok,
      status: response.status,
      body: response.ok ? json : null,
      message: json?.error?.message ?? json?.message ?? null,
    }
  } catch {
    return { ok: false, status: 0, body: null, message: 'No se pudo conectar con el servidor' }
  }
}

export const sendMessage = (token: string, message: MessageRequest) =>
  callApi(token, '/api/messages', { method: 'POST', body: message })

export const actOnProposal = (token: string, proposalId: string, action: ProposalAction) =>
  callApi<ProposalActionResponse>(
    token,
    `/api/proposals/${encodeURIComponent(proposalId)}/${action}`,
    { method: 'POST' }
  )
