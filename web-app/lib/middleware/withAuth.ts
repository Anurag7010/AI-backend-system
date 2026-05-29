import { NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { Middleware } from './types'
import { toUserId } from '@/types'

interface AuthOptions {
  required: boolean
}

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production'

// HS256 JWT verification using Node.js crypto — avoids jose cross-realm
// Uint8Array issues in vitest and works in the Node.js runtime Next.js uses.
function verifyJwtHs256(token: string, secret: string): { sub?: string; exp?: number } {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Invalid JWT format')

  const [headerB64, payloadB64, sigB64] = parts
  const data = `${headerB64}.${payloadB64}`

  const expectedSig = createHmac('sha256', secret).update(data).digest()
  const providedSig = Buffer.from(sigB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64')

  if (expectedSig.length !== providedSig.length || !timingSafeEqual(expectedSig, providedSig)) {
    throw new Error('JWT signature verification failed')
  }

  const payload = JSON.parse(Buffer.from(payloadB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8'))

  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('JWT expired')
  }

  return payload
}

export function withAuth(options: AuthOptions = { required: true }): Middleware {
  return (handler) => {
    return async (req, context) => {
      const authHeader = req.headers.get('authorization')

      const token = authHeader?.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null

      if (!token) {
        if (options.required) {
          return NextResponse.json(
            {
              error: 'AUTH_REQUIRED',
              message: 'Authentication token is required',
              requestId: context.requestId,
              timestamp: new Date().toISOString(),
            },
            {
              status: 401,
              headers: { 'WWW-Authenticate': 'Bearer' },
            }
          )
        }
        return handler(req, context)
      }

      try {
        const payload = verifyJwtHs256(token, JWT_SECRET)
        context.userId = toUserId(payload.sub ?? '')
        return handler(req, context)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : ''
        const code = errorMessage.includes('expired') ? 'AUTH_EXPIRED' : 'AUTH_INVALID'
        const message = code === 'AUTH_EXPIRED'
          ? 'Token has expired — please refresh'
          : 'Token is invalid'

        return NextResponse.json(
          { error: code, message, requestId: context.requestId, timestamp: new Date().toISOString() },
          { status: 401 }
        )
      }
    }
  }
}