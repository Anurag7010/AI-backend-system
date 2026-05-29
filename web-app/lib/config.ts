// Validates all required environment variables on startup.
// Throws a clear error if any are missing — never fails silently.
// NEXT_PUBLIC_ vars are available client-side — all others are server-only.
// Import this in root layout so validation runs at boot time.

const serverVars = ['DATABASE_URL', 'JWT_SECRET', 'LOG_LEVEL', 'AI_BACKEND_URL', 'AI_BACKEND_API_KEY'] as const
const publicVars = ['NEXT_PUBLIC_AI_BACKEND_URL'] as const

type ServerVar = typeof serverVars[number]
type PublicVar = typeof publicVars[number]

function validateServerConfig(): void {
  // Only run on the server — NEXT_PUBLIC_ vars are the only ones exposed to the browser
  if (typeof window !== 'undefined') return

  const missing: string[] = []

  for (const key of serverVars) {
    if (!process.env[key]) missing.push(key)
  }

  for (const key of publicVars) {
    if (!process.env[key]) missing.push(key)
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Copy web-app/.env.example to web-app/.env.local and fill in values.`
    )
  }
}

validateServerConfig()

export const config = {
  DATABASE_URL: process.env.DATABASE_URL as string,
  JWT_SECRET: process.env.JWT_SECRET as string,
  LOG_LEVEL: process.env.LOG_LEVEL as string,
  NEXT_PUBLIC_AI_BACKEND_URL: process.env.NEXT_PUBLIC_AI_BACKEND_URL as string,
  // Server-only — never exposed to the browser
  AI_BACKEND_URL: process.env.AI_BACKEND_URL as string,
  AI_BACKEND_API_KEY: process.env.AI_BACKEND_API_KEY as string,
} satisfies Record<ServerVar | PublicVar, string>
