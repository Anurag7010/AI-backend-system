import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeRequest, makeAuthRequest, TEST_USER_ID } from '../setup/server'
import type { DocumentStatus } from '../../db/schema'

// Mock repositories — route tests do not touch real database
vi.mock('../../db/repositories/documents', () => ({
  create: vi.fn(),
  findById: vi.fn(),
  findByUser: vi.fn(),
  updateStatus: vi.fn(),
  deleteDocument: vi.fn(),
}))

vi.mock('../../db/repositories/queries', () => ({
  create: vi.fn(),
  findByUser: vi.fn(),
  findByDocument: vi.fn(),
  updateAnswer: vi.fn(),
}))

import * as documentsRepo from '../../db/repositories/documents'
import { GET, POST } from '../../app/api/documents/route'
import {
  GET as getById,
  PATCH,
  DELETE,
} from '../../app/api/documents/[id]/route'

const mockDocument: {
  id: string
  userId: string
  filename: string
  status: DocumentStatus
  chunkCount: number
  createdAt: Date
  updatedAt: Date
} = {
  id: 'doc-001',
  userId: TEST_USER_ID,
  filename: 'test.pdf',
  status: 'pending',
  chunkCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => {
  // Reset all mocks — prevents state leaking between tests
  vi.resetAllMocks()
})

// ============================================================
// GET /api/documents
// ============================================================

describe('GET /api/documents', () => {

  it('returns 200 with array of documents for authenticated user', async () => {
    vi.mocked(documentsRepo.findByUser).mockResolvedValue([mockDocument])

    const res = await makeAuthRequest(GET)

    expect(res.status).toBe(200)
    expect((res.body as any).data).toHaveLength(1)
  })

  it('calls findByUser with correct userId from auth context', async () => {
    // Proves middleware correctly extracts userId from JWT and passes to handler
    vi.mocked(documentsRepo.findByUser).mockResolvedValue([])

    await makeAuthRequest(GET, {}, TEST_USER_ID)

    expect(documentsRepo.findByUser).toHaveBeenCalledWith(TEST_USER_ID)
  })

  it('returns 200 with empty array when user has no documents', async () => {
    // Proves empty state is 200 not 404 — no documents is a valid state
    vi.mocked(documentsRepo.findByUser).mockResolvedValue([])

    const res = await makeAuthRequest(GET)

    expect(res.status).toBe(200)
    expect((res.body as any).data).toEqual([])
  })

  it('returns 401 when Authorization header is missing', async () => {
    // Proves withAuth middleware short-circuits unauthenticated requests
    const res = await makeRequest(GET)

    expect(res.status).toBe(401)
  })

  it('returns 401 when token is invalid', async () => {
    const res = await makeRequest(GET, {
      headers: { Authorization: 'Bearer invalid.token.here' },
    })

    expect(res.status).toBe(401)
  })

  it('response includes X-Request-ID header', async () => {
    // Proves withRequestId middleware runs and attaches trace ID
    vi.mocked(documentsRepo.findByUser).mockResolvedValue([])

    const res = await makeAuthRequest(GET)

    expect(res.headers.get('x-request-id')).toBeTruthy()
  })

})

// ============================================================
// POST /api/documents
// ============================================================

describe('POST /api/documents', () => {

  it('returns 201 with created document on valid request', async () => {
    vi.mocked(documentsRepo.create).mockResolvedValue(mockDocument)

    const res = await makeAuthRequest(POST, {
      method: 'POST',
      body: { filename: 'report.pdf' },
    })

    expect(res.status).toBe(201)
    expect((res.body as any).data.filename).toBe('test.pdf')
  })

  it('returns Location header pointing to created resource', async () => {
    // Proves REST convention — 201 always includes Location
    vi.mocked(documentsRepo.create).mockResolvedValue(mockDocument)

    const res = await makeAuthRequest(POST, {
      method: 'POST',
      body: { filename: 'report.pdf' },
    })

    expect(res.headers.get('location')).toBe('/api/documents/doc-001')
  })

  it('calls create() with userId from auth context', async () => {
    // Proves userId is sourced from JWT — not from request body (security)
    vi.mocked(documentsRepo.create).mockResolvedValue(mockDocument)

    await makeAuthRequest(POST, { method: 'POST', body: { filename: 'f.pdf' } })

    expect(documentsRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: TEST_USER_ID })
    )
  })

  it('returns 422 when filename is missing from body', async () => {
    // Proves withValidation rejects before handler runs
    const res = await makeAuthRequest(POST, {
      method: 'POST',
      body: {},
    })

    expect(res.status).toBe(422)
  })

  it('returns 422 with field-level error details on validation failure', async () => {
    // Proves Zod errors are mapped to field-level array — not just a generic message
    const res = await makeAuthRequest(POST, {
      method: 'POST',
      body: {},
    })

    const body = res.body as any
    expect(body.fields).toBeDefined()
    expect(body.fields[0].field).toBe('filename')
  })

  it('returns 401 when not authenticated', async () => {
    const res = await makeRequest(POST, { method: 'POST', body: { filename: 'f.pdf' } })
    expect(res.status).toBe(401)
  })

  it('returns 500 when repository throws — no stack trace in response', async () => {
    // Proves withErrorHandler catches unexpected errors
    // Stack traces must never appear in API responses — they leak internals
    vi.mocked(documentsRepo.create).mockRejectedValue(new Error('DB connection lost'))

    const res = await makeAuthRequest(POST, { method: 'POST', body: { filename: 'f.pdf' } })

    expect(res.status).toBe(500)
    const body = res.body as any
    expect(body.stack).toBeUndefined()
    expect(body.error).toBe('INTERNAL_SERVER_ERROR')
  })

})

// ============================================================
// GET /api/documents/[id]
// ============================================================

describe('GET /api/documents/[id]', () => {

  it('returns 200 with document when found and owned by requester', async () => {
    vi.mocked(documentsRepo.findById).mockResolvedValue(mockDocument)

    const res = await makeAuthRequest(getById, { params: { id: 'doc-001' } })

    expect(res.status).toBe(200)
    expect((res.body as any).data.id).toBe('doc-001')
  })

  it('returns 404 when document does not exist', async () => {
    vi.mocked(documentsRepo.findById).mockResolvedValue(null)

    const res = await makeAuthRequest(getById, { params: { id: 'missing-id' } })

    expect(res.status).toBe(404)
  })

  it('returns 403 when document belongs to different user', async () => {
    // Proves ownership check — authenticated but not authorized
    vi.mocked(documentsRepo.findById).mockResolvedValue({
      ...mockDocument,
      userId: 'different-user-id', // owned by someone else
    })

    const res = await makeAuthRequest(getById, { params: { id: 'doc-001' } })

    expect(res.status).toBe(403)
  })

  it('returns 401 when not authenticated', async () => {
    const res = await makeRequest(getById, { params: { id: 'doc-001' } })
    expect(res.status).toBe(401)
  })

})

// ============================================================
// PATCH /api/documents/[id]
// ============================================================

describe('PATCH /api/documents/[id]', () => {

  it('returns 200 with updated document on valid request', async () => {
    vi.mocked(documentsRepo.findById).mockResolvedValue(mockDocument)
    vi.mocked(documentsRepo.updateStatus).mockResolvedValue({
      ...mockDocument,
      status: 'ingested',
      chunkCount: 10,
    })

    const res = await makeAuthRequest(PATCH, {
      method: 'PATCH',
      body: { status: 'ingested', chunkCount: 10 },
      params: { id: 'doc-001' },
    })

    expect(res.status).toBe(200)
    expect((res.body as any).data.status).toBe('ingested')
  })

  it('returns 422 on invalid status value', async () => {
    vi.mocked(documentsRepo.findById).mockResolvedValue(mockDocument)

    const res = await makeAuthRequest(PATCH, {
      method: 'PATCH',
      body: { status: 'invalid-status' },
      params: { id: 'doc-001' },
    })

    expect(res.status).toBe(422)
  })

  it('returns 403 on ownership violation', async () => {
    vi.mocked(documentsRepo.findById).mockResolvedValue({
      ...mockDocument,
      userId: 'someone-else',
    })

    const res = await makeAuthRequest(PATCH, {
      method: 'PATCH',
      body: { status: 'ingested' },
      params: { id: 'doc-001' },
    })

    expect(res.status).toBe(403)
  })

  it('returns 401 when not authenticated', async () => {
    const res = await makeRequest(PATCH, {
      method: 'PATCH',
      body: { status: 'ingested' },
      params: { id: 'doc-001' },
    })
    expect(res.status).toBe(401)
  })

})

// ============================================================
// DELETE /api/documents/[id]
// ============================================================

describe('DELETE /api/documents/[id]', () => {

  it('returns 204 with no body on success', async () => {
    vi.mocked(documentsRepo.findById).mockResolvedValue(mockDocument)
    vi.mocked(documentsRepo.deleteDocument).mockResolvedValue(true)

    const res = await makeAuthRequest(DELETE, {
      method: 'DELETE',
      params: { id: 'doc-001' },
    })

    expect(res.status).toBe(204)
    // Body must be null/empty — 204 means No Content
    // Sending a body with 204 violates HTTP spec
    expect(res.body).toBeNull()
  })

  it('returns 404 when document does not exist', async () => {
    vi.mocked(documentsRepo.findById).mockResolvedValue(null)

    const res = await makeAuthRequest(DELETE, {
      method: 'DELETE',
      params: { id: 'missing' },
    })

    expect(res.status).toBe(404)
  })

  it('returns 403 on ownership violation', async () => {
    vi.mocked(documentsRepo.findById).mockResolvedValue({
      ...mockDocument,
      userId: 'someone-else',
    })

    const res = await makeAuthRequest(DELETE, {
      method: 'DELETE',
      params: { id: 'doc-001' },
    })

    expect(res.status).toBe(403)
  })

  it('returns 401 when not authenticated', async () => {
    const res = await makeRequest(DELETE, {
      method: 'DELETE',
      params: { id: 'doc-001' },
    })
    expect(res.status).toBe(401)
  })

})