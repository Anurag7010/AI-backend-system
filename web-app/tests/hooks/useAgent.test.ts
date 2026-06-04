import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAgent } from '../../hooks/useAgent'
import type { AgentRunResponse } from '../../types'

// Mock useAuth so getAccessToken returns a dummy token without auth setup
vi.mock('../../hooks/useAuth', () => ({
  getAccessToken: () => 'test-token',
  useAuth: vi.fn(),
}))

const mockAgentResponse: AgentRunResponse = {
  answer: 'You have 3 documents.',
  steps: [
    {
      stepNumber: 1,
      action: 'get_document_list',
      actionInput: {},
      observation: '[{"filename": "doc1.pdf"}, {"filename": "doc2.pdf"}, {"filename": "doc3.pdf"}]',
      isFinal: false,
      finalAnswer: null,
    },
    {
      stepNumber: 2,
      action: null,
      actionInput: null,
      observation: null,
      isFinal: true,
      finalAnswer: 'You have 3 documents.',
    },
  ],
  totalSteps: 2,
  stoppedReason: 'final_answer',
  traceId: 'trace-001',
  routedTo: 'agent',
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('useAgent', () => {
  it('starts with idle state and empty steps', () => {
    const { result } = renderHook(() => useAgent())
    expect(result.current.state.status).toBe('idle')
    expect(result.current.steps).toEqual([])
    expect(result.current.isRunning).toBe(false)
  })

  it('sets state to loading immediately when run() is called', async () => {
    let resolveRequest!: (value: Response) => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(res => { resolveRequest = res })))

    const { result } = renderHook(() => useAgent())

    act(() => { result.current.run('how many documents do I have?') })

    // Check mid-flight — before fetch resolves
    expect(result.current.state.status).toBe('loading')
    expect(result.current.isRunning).toBe(true)

    // Clean up the pending promise
    await act(async () => {
      resolveRequest(new Response(JSON.stringify(mockAgentResponse), { status: 200 }))
    })
  })

  it('sets state to success with steps on successful response', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(
      new Response(JSON.stringify(mockAgentResponse), { status: 200 })
    )))

    const { result } = renderHook(() => useAgent())

    await act(async () => {
      await result.current.run('how many documents?')
    })

    expect(result.current.state.status).toBe('success')
    if (result.current.state.status === 'success') {
      expect(result.current.state.data.answer).toBe('You have 3 documents.')
    }
    expect(result.current.steps).toHaveLength(2)
    expect(result.current.isRunning).toBe(false)
  })

  it('sets state to error on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(
      new Response(JSON.stringify({ message: 'Server error' }), { status: 500 })
    )))

    const { result } = renderHook(() => useAgent())

    await act(async () => {
      await result.current.run('query')
    })

    expect(result.current.state.status).toBe('error')
    if (result.current.state.status === 'error') {
      expect(result.current.state.error).toBe('Server error')
    }
    expect(result.current.isRunning).toBe(false)
  })

  it('sets state to error on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('Network error'))))

    const { result } = renderHook(() => useAgent())

    await act(async () => {
      await result.current.run('query')
    })

    expect(result.current.state.status).toBe('error')
    expect(result.current.isRunning).toBe(false)
  })

  it('reset() returns to idle with empty steps', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(
      new Response(JSON.stringify(mockAgentResponse), { status: 200 })
    )))

    const { result } = renderHook(() => useAgent())

    await act(async () => {
      await result.current.run('how many documents?')
    })

    expect(result.current.state.status).toBe('success')

    act(() => { result.current.reset() })

    expect(result.current.state.status).toBe('idle')
    expect(result.current.steps).toEqual([])
    expect(result.current.isRunning).toBe(false)
  })

  it('isRunning is true during fetch and false after', async () => {
    let resolveRequest!: (value: Response) => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(res => { resolveRequest = res })))

    const { result } = renderHook(() => useAgent())

    act(() => { result.current.run('query') })
    expect(result.current.isRunning).toBe(true)

    await act(async () => {
      resolveRequest(new Response(JSON.stringify(mockAgentResponse), { status: 200 }))
    })

    expect(result.current.isRunning).toBe(false)
  })
})
