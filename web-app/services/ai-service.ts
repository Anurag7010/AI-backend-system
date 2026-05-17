import { BaseService, ServiceResponse } from './base-service'
import type {
  AskRequest,
  AskResponse,
  IngestResponse,
} from '../types'
import { isAskResponse, isIngestResponse } from '../lib/type-guards'

// RetrieveResponse stays local — not yet in types/ (added in a later block)
interface RetrieveResponse {
  chunks: Array<{
    content: string
    score: number
    metadata: Record<string, unknown>
  }>
}

export interface IngestRequest {
  file: File
  signal?: AbortSignal
}

export interface RetrieveRequest {
  query: string
  top_k?: number
  strategy?: string
}

export class AIService extends BaseService {
  constructor() {
    const baseUrl =
      process.env.NEXT_PUBLIC_AI_BACKEND_URL ?? 'http://localhost:8000'

    super(baseUrl, {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    })
  }

  async ask({
    query,
    history = [],
    signal,
  }: AskRequest): Promise<ServiceResponse<AskResponse>> {
    // Type as unknown — validate shape before trusting it
    const response = await this.request<unknown>('/ask', {
      method: 'POST',
      body: { query, history },
      signal,
      deduplicate: false,
      timeoutMs: 30_000,
      maxAttempts: 2,
    })

    if (response.error) {
      return response as ServiceResponse<AskResponse>
    }

    // Validate shape — AI backend could return anything
    if (!isAskResponse(response.data)) {
      return {
        data: null,
        error: {
          name: 'ServiceError',
          code: 'PARSE_ERROR',
          message: 'AI backend returned unexpected response shape',
          retryable: false,
          originalError: response.data,
        } as any,
        status: response.status,
        latencyMs: response.latencyMs,
      }
    }

    return { ...response, data: response.data }
  }

  async ingest({
    file,
    signal,
  }: IngestRequest): Promise<ServiceResponse<IngestResponse>> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('filename', file.name)

    const response = await this.request<unknown>('/ingest', {
      method: 'POST',
      body: formData,
      signal,
      deduplicate: false,
      timeoutMs: 60_000,
      maxAttempts: 2,
    })

    if (response.error) {
      return response as ServiceResponse<IngestResponse>
    }

    if (!isIngestResponse(response.data)) {
      return {
        data: null,
        error: {
          name: 'ServiceError',
          code: 'PARSE_ERROR',
          message: 'Unexpected ingest response shape',
          retryable: false,
          originalError: response.data,
        } as any,
        status: response.status,
        latencyMs: response.latencyMs,
      }
    }

    return { ...response, data: response.data }
  }

  async retrieve({
    query,
    top_k = 5,
    strategy = 'semantic',
  }: RetrieveRequest): Promise<ServiceResponse<RetrieveResponse>> {
    const params = new URLSearchParams({
      query,
      top_k: String(top_k),
      strategy,
    })

    return this.request<RetrieveResponse>(`/retrieve?${params.toString()}`, {
      method: 'GET',
      deduplicate: true,
      timeoutMs: 10_000,
      maxAttempts: 3,
    })
  }
}

export const aiService = new AIService()