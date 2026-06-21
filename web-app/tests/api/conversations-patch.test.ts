import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeRequest, makeAuthRequest, TEST_USER_ID } from '../setup/server'

vi.mock('server-only', () => ({}))

// next/headers is not available in vitest jsdom
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ get: vi.fn(() => null), set: vi.fn() })),
  headers: vi.fn(() => ({ get: vi.fn(() => null) })),
}))

// jose cross-realm Uint8Array issue in vitest VM — use the shared crypto-based mock
import { jwtMock } from '../setup/jwt-mock'
vi.mock('../../lib/jwt', () => jwtMock())

// Stub conversations repository
vi.mock('../../db/repositories/conversations', () => ({
  findConversationById: vi.fn(),
  updateConversationTitle: vi.fn(),
}))

import * as convoRepo from '../../db/repositories/conversations'
import { PATCH } from '../../app/api/conversations/[id]/route'
import type { NextRequest, NextResponse } from 'next/server'

// Next.js 15 route params are Promise-typed; test helper passes plain objects at runtime.
type CompatHandler = (req: NextRequest, ctx?: Record<string, unknown>) => Promise<NextResponse>
const patchHandler = PATCH as unknown as CompatHandler

const mockFindById = vi.mocked(convoRepo.findConversationById)
const mockUpdateTitle = vi.mocked(convoRepo.updateConversationTitle)

const MOCK_CONVERSATION = {
  id: 'conv-001',
  userId: TEST_USER_ID,
  title: 'Old title',
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => {
  vi.resetAllMocks()
})

// ── PATCH /api/conversations/[id] ────────────────────────────────────────────

describe('PATCH /api/conversations/[id]', () => {
  it('401 when no Authorization header is provided', async () => {
    const res = await makeRequest(patchHandler, {
      method: 'PATCH',
      body: { title: 'New title' },
      params: { id: 'conv-001' },
    })

    expect(res.status).toBe(401)
  })

  it('422 when title field is missing', async () => {
    const res = await makeAuthRequest(patchHandler, {
      method: 'PATCH',
      body: {},
      params: { id: 'conv-001' },
    })

    expect(res.status).toBe(422)
    const body = res.body as Record<string, unknown>
    expect(typeof body.error).toBe('string')
  })

  it('422 when title is an empty string', async () => {
    const res = await makeAuthRequest(patchHandler, {
      method: 'PATCH',
      body: { title: '   ' },
      params: { id: 'conv-001' },
    })

    expect(res.status).toBe(422)
  })

  it('404 when conversation does not belong to the authenticated user', async () => {
    mockFindById.mockResolvedValue(null)

    const res = await makeAuthRequest(patchHandler, {
      method: 'PATCH',
      body: { title: 'New title' },
      params: { id: 'conv-999' },
    })

    expect(res.status).toBe(404)
    const body = res.body as Record<string, unknown>
    expect(body.error).toBe('NOT_FOUND')
  })

  it('200 with id and trimmed title on valid request', async () => {
    mockFindById.mockResolvedValue(MOCK_CONVERSATION)
    mockUpdateTitle.mockResolvedValue(undefined)

    const res = await makeAuthRequest(patchHandler, {
      method: 'PATCH',
      body: { title: '  My renamed conversation  ' },
      params: { id: 'conv-001' },
    })

    expect(res.status).toBe(200)
    const body = res.body as Record<string, unknown>
    expect(body.id).toBe('conv-001')
    expect(body.title).toBe('My renamed conversation')
  })

  it('200 trims title to 100 characters maximum', async () => {
    mockFindById.mockResolvedValue(MOCK_CONVERSATION)
    mockUpdateTitle.mockResolvedValue(undefined)

    const longTitle = 'A'.repeat(150)

    const res = await makeAuthRequest(patchHandler, {
      method: 'PATCH',
      body: { title: longTitle },
      params: { id: 'conv-001' },
    })

    expect(res.status).toBe(200)
    const body = res.body as Record<string, unknown>
    expect(typeof body.title).toBe('string')
    expect((body.title as string).length).toBeLessThanOrEqual(100)
  })
})
