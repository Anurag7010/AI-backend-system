'use server'
// import { cookies } from 'next/headers'
// ↑ Will be used in production auth — commented out for stub implementation

export type Session = {
  userId: string
  email: string
}

/**
 * getSession — reads session from cookie and returns user info.
 * Real implementation: decrypt a signed JWT from the cookie,
 * verify it against the JWT_SECRET, and return the payload.
 * For now: returns a mock session so layouts and pages work during development.
 */
export async function getSession(): Promise<Session | null> {
  // Stub — always returns a mock session
  // On auth day: read cookies().get('session'), decrypt JWT, return payload or null
  return {
    userId: '00000000-0000-0000-0000-000000000001',
    email: 'dev@aiproduct.com',
  }
}

/**
 * createSessionCookie — signs a JWT and sets it as an httpOnly cookie.
 * Real implementation: sign { userId, email } with JWT_SECRET,
 * set as httpOnly, secure, sameSite=lax cookie with expiry.
 * For now: no-op — cookie is not actually set.
 */
export async function createSessionCookie(
  userId: string,
  email: string
): Promise<void> {
  // On auth day: cookies().set('session', signedJwt, { httpOnly: true, secure: true })
  console.log('[auth stub] createSessionCookie called for', email)
}

/**
 * clearSessionCookie — deletes the session cookie on sign out.
 * Real implementation: cookies().delete('session')
 */
export async function clearSessionCookie(): Promise<void> {
  // On auth day: cookies().delete('session')
  console.log('[auth stub] clearSessionCookie called')
}