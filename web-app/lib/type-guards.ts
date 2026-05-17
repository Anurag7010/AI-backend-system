import type {
  AskResponse,
  IngestResponse,
  Document,
  DocumentSummary,
} from '../types'

/**
 * Generic guard factory.
 * Checks that data is a non-null object with all required keys present.
 * Does not validate value types — use specific guards for that.
 * Use this as a first-pass check before more specific validation.
 */
export function hasRequiredKeys<T extends object>(
  data: unknown,
  keys: readonly (keyof T)[]
): data is T {
  if (typeof data !== 'object' || data === null) return false
  return keys.every(key => key in data)
}

/**
 * Validates shape of unknown API response before using it.
 * Called in AIService.ask() after fetch — prevents runtime crashes
 * from unexpected backend response shapes.
 */
export function isAskResponse(data: unknown): data is AskResponse {
  if (!hasRequiredKeys<AskResponse>(data, ['answer', 'sources', 'traceId', 'latencyBreakdown'])) {
    return false
  }
  const d = data as AskResponse
  if (typeof d.answer !== 'string') return false
  if (!Array.isArray(d.sources)) return false
  if (typeof d.traceId !== 'string') return false
  if (
    typeof d.latencyBreakdown !== 'object' ||
    d.latencyBreakdown === null ||
    typeof d.latencyBreakdown.retrievalMs !== 'number' ||
    typeof d.latencyBreakdown.generationMs !== 'number' ||
    typeof d.latencyBreakdown.totalMs !== 'number'
  ) return false
  return true
}

export function isIngestResponse(data: unknown): data is IngestResponse {
  if (!hasRequiredKeys<IngestResponse>(data, ['documentId', 'status', 'chunkCount'])) {
    return false
  }
  const d = data as IngestResponse
  if (typeof d.documentId !== 'string') return false
  if (!['pending', 'ingested', 'failed'].includes(d.status)) return false
  if (typeof d.chunkCount !== 'number') return false
  return true
}

export function isDocument(data: unknown): data is Document {
  if (!hasRequiredKeys<Document>(data, [
    'id', 'userId', 'filename', 'status', 'chunkCount', 'createdAt', 'updatedAt'
  ])) return false
  const d = data as Document
  if (typeof d.id !== 'string') return false
  if (typeof d.filename !== 'string') return false
  if (!['pending', 'ingested', 'failed'].includes(d.status)) return false
  return true
}

export function isDocumentSummaryArray(data: unknown): data is readonly DocumentSummary[] {
  if (!Array.isArray(data)) return false
  // Check each item has minimum required fields for a summary
  return data.every(item =>
    hasRequiredKeys<DocumentSummary>(item, ['id', 'filename', 'status', 'createdAt'])
  )
}