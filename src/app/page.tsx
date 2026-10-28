import { GuestPanel } from '@/components/guest/guest-panel'
import { ManagerPanel } from '@/components/manager/manager-panel'
import { listIdentities } from '@/server/auth/identities'
import type { GuestIdentity, ManagerIdentity } from '@/server/schemas/identity'
import { parseSearch } from '@/utils/search'

export default async function Home({ searchParams }: PageProps<'/'>) {
  const search = parseSearch(await searchParams)

  const identities = listIdentities()
  const guests = identities.filter((i): i is GuestIdentity => i.role === 'guest')
  const managers = identities.filter((i): i is ManagerIdentity => i.role === 'manager')

  const guest = guests.find((g) => g.token === search.guest) ?? guests[0]
  const manager = managers.find((m) => m.token === search.manager) ?? managers[0]

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Una salida más tarde</h1>
        <p className="max-w-3xl text-sm text-zinc-500 dark:text-zinc-400">
          Solicitudes de salida tardía. Cada panel usa una sesión de demostración del kit; el
          servidor decide rol, hotel y reserva a partir de ella.
        </p>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <GuestPanel sessions={guests} guest={guest} search={search} />
        <ManagerPanel sessions={managers} manager={manager} search={search} />
      </div>
    </main>
  )
}
