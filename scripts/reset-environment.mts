import 'dotenv/config'
import { spawn } from 'node:child_process'
import { TIMEOUT_MS, USER_AGENT } from '../src/server/clients/constants'

const required = (name: string): string => {
  const value = process.env[name]
  if (!value) throw new Error(`Falta la variable de entorno ${name}`)
  return value
}

const resetDatabase = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['exec', 'prisma', 'migrate', 'reset', '--force'], {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    })

    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (code === 0) return resolve()
      reject(new Error(`El reset de SQLite terminó con ${signal ?? `código ${code}`}`))
    })
  })
}

const resetRemote = async (
  name: string,
  baseUrl: string,
  token: string,
  scenario: string
): Promise<void> => {
  let response: Response
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, '')}/test/reset`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': USER_AGENT,
        'X-Test-Scenario': scenario,
      },
      body: '{}',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(`${name} no respondió: ${reason}`)
  }

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`${name} respondió ${response.status}: ${body}`)
  }

  console.log(`${name} restablecido (escenario ${scenario})`)
}

try {
  const reservationsBaseUrl = required('RESERVATIONS_BASE_URL')
  const reservationsToken = required('RESERVATIONS_TESTER_TOKEN')
  const reservationsScenario = required('RESERVATIONS_SCENARIO')
  const llmBaseUrl = required('LLM_BASE_URL')
  const llmToken = required('LLM_TESTER_TOKEN')
  const llmScenario = required('LLM_SCENARIO')

  await resetDatabase()
  console.log('BD local restablecida')

  await resetRemote(
    'Servicio de reservas',
    reservationsBaseUrl,
    reservationsToken,
    reservationsScenario
  )
  await resetRemote('IA simulada', llmBaseUrl, llmToken, llmScenario)

  console.log('Entorno restablecido correctamente.')
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`No se pudo restablecer el entorno: ${message}`)
  process.exitCode = 1
}
