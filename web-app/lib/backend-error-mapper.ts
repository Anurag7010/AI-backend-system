import { ServiceError } from '@/services/base-service'

export class BackendError extends Error {
  status: number
  code: string
  traceId?: string

  constructor(message: string, status: number, code: string, traceId?: string) {
    super(message)
    this.name = 'BackendError'
    this.status = status
    this.code = code
    this.traceId = traceId
    Object.setPrototypeOf(this, BackendError.prototype)
  }
}

// Maps Python backend HTTP status codes and network failures to ServiceError.
// Centralizes retry logic: 429/5xx are transient, 4xx are permanent.
export function mapBackendError(error: unknown): ServiceError {
  const se = new ServiceError()
  se.originalError = error

  if (error instanceof BackendError) {
    se.status = error.status
    switch (error.status) {
      case 400:
        se.code = 'VALIDATION_ERROR'; se.retryable = false
        se.message = error.message
        break
      case 401:
        se.code = 'AUTH_ERROR'; se.retryable = false
        se.message = 'Backend authentication failed — check AI_BACKEND_API_KEY'
        break
      case 422:
        se.code = 'VALIDATION_ERROR'; se.retryable = false
        se.message = error.message
        break
      case 429:
        se.code = 'RATE_LIMITED'; se.retryable = true
        se.message = 'AI backend rate limit reached — retry after a moment'
        break
      case 500:
        se.code = 'BACKEND_ERROR'; se.retryable = true
        se.message = 'AI backend internal error'
        break
      case 502:
        se.code = 'BACKEND_UNAVAILABLE'; se.retryable = true
        se.message = 'AI backend is unavailable'
        break
      case 503:
        se.code = 'BACKEND_UNAVAILABLE'; se.retryable = true
        se.message = 'AI backend is temporarily unavailable'
        break
      case 504:
        se.code = 'TIMEOUT'; se.retryable = true
        se.message = 'AI backend request timed out'
        break
      default:
        se.code = 'HTTP_ERROR'; se.retryable = false
        se.message = error.message
    }
    return se
  }

  if (error instanceof TypeError) {
    se.code = 'NETWORK_ERROR'
    se.message = 'Network error reaching AI backend — is it running?'
    se.retryable = true
    return se
  }

  se.code = 'UNKNOWN'
  se.message = error instanceof Error ? error.message : 'Unknown backend error'
  se.retryable = false
  return se
}
