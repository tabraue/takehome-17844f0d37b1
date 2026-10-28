const keys = ['guest', 'manager', 'chat'] as const

type Key = (typeof keys)[number]
export type Search = Partial<Record<Key, string>>

export const parseSearch = (params: Record<string, string | string[] | undefined>): Search => {
  const search: Search = {}
  for (const key of keys) {
    const value = params[key]
    if (typeof value === 'string' && value) search[key] = value
  }
  return search
}

export const hrefWith = (search: Search, changes: Partial<Record<Key, string | null>>) => {
  const params = new URLSearchParams()
  for (const key of keys) {
    const value = key in changes ? changes[key] : search[key]
    if (value) params.set(key, value)
  }
  const query = params.toString()
  return query ? `/?${query}` : '/'
}
