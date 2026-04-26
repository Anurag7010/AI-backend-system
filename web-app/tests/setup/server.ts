import { NextRequest, NextResponse } from 'next/server'
import type { RequestInit } from 'next/dist/server/web/spec-extension/request'
import { SignJWT } from 'jose'
import { RequestContext } from '../../lib/middleware/types'

// Fixed test user ID — used when no specific userId needed
export const TEST_USER_ID = '00000000-0000-0000-0000-000000000001'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'test-secret-do-not-use-in-production'
)

interface RequestOptions {
  method?: string
  body?: unknown
  headers?: Record<string, string>
  params?: Record<string, string>
  searchParams?: Record<string, string>
}

interface TestResponse {
  status: number
  body: unknown
  headers: Headers
}

/**
 * Generates a valid JWT for test requests.
 * Uses the same secret as withAuth middleware — tokens will pass validation.
 */
export async function generateTestToken(userId = TEST_USER_ID): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(JWT_SECRET)
}

/**
 * Calls a route handler directly — simulates Next.js request lifecycle.
 * Returns parsed response for assertions.
 */
export async function makeRequest(
  handler: (req: NextRequest, ctx?: any) => Promise<NextResponse>,
  options: RequestOptions = {}
): Promise<TestResponse> {
  const {
    method = 'GET',
    body,
    headers = {},
    params = {},
    searchParams = {},
  } = options

  // Build URL with search params
  const url = new URL(`http://localhost/api/test`)
  Object.entries(searchParams).forEach(([k, v]) => url.searchParams.set(k, v))

  const requestInit: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  } as RequestInit

  if (body !== undefined) {
    requestInit.body = JSON.stringify(body)
  }

  const req = new NextRequest(url.toString(), requestInit)

  // Pass params as Next.js route context (for [id] routes)
  const response = await handler(req, { params })

  // Parse body — handle empty responses (204)
  let parsedBody: unknown = null
  const contentType = response.headers.get('content-type')
  if (contentType?.includes('application/json')) {
    const text = await response.text()
    parsedBody = text ? JSON.parse(text) : null
  }

  return {
    status: response.status,
    body: parsedBody,
    headers: response.headers,
  }
}

/**
 * Same as makeRequest but injects a valid JWT.
 * Tests protected routes without a real auth system.
 */
export async function makeAuthRequest(
  handler: (req: NextRequest, ctx?: any) => Promise<NextResponse>,
  options: RequestOptions = {},
  userId = TEST_USER_ID
): Promise<TestResponse> {
  const token = await generateTestToken(userId)
  return makeRequest(handler, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  })
}