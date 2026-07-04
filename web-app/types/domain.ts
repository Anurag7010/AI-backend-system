// ============================================================
// BRANDED ID TYPES
// Branded types prevent accidental ID swapping at compile time.
// A UserId cannot be passed where a DocumentId is expected —
// even though both are strings at runtime.
// ============================================================

export type UserId = string & { readonly _brand: 'UserId' }
export type DocumentId = string & { readonly _brand: 'DocumentId' }
export type QueryId = string & { readonly _brand: 'QueryId' }

// Brand constructors — the ONLY way to create branded IDs.
// Call these at the API boundary (when data arrives from DB or HTTP).
// Everywhere else in the app, IDs are already branded.
export const toUserId = (id: string): UserId => id as UserId
export const toDocumentId = (id: string): DocumentId => id as DocumentId
export const toQueryId = (id: string): QueryId => id as QueryId

// ============================================================
// DOCUMENT STATUS
// Literal union — exhaustive checks enforced by assertNever
// ============================================================

export type DocumentStatus = 'pending' | 'ingested' | 'failed'

/**
 * Exhaustive check helper.
 * Use at the end of switch statements on DocumentStatus.
 * If a new status is added to the union and you forget to handle it,
 * TypeScript will error at the assertNever call — not at runtime.
 *
 * Usage:
 *   switch (doc.status) {
 *     case 'pending': ...
 *     case 'ingested': ...
 *     case 'failed': ...
 *     default: assertNever(doc.status)
 *   }
 */
export function assertNever(x: never, message = 'Unhandled case'): never {
  throw new Error(`${message}: ${JSON.stringify(x)}`)
}

// ============================================================
// CORE DOMAIN TYPES
// These mirror the DB schema but are application-level types.
// DB types (from Drizzle) may diverge — e.g. Drizzle uses string
// for UUIDs, domain types use branded IDs.
// Fields that should never change after creation are readonly.
// ============================================================

export type User = {
  readonly id: UserId
  readonly email: string
  readonly createdAt: Date
}

export type Document = {
  readonly id: DocumentId
  readonly userId: UserId
  readonly filename: string
  // status CAN change (pending → ingested/failed) but only via explicit update
  status: DocumentStatus
  chunkCount: number
  readonly createdAt: Date
  updatedAt: Date
}

export type Query = {
  readonly id: QueryId
  readonly userId: UserId
  // nullable — query may not be tied to a specific document
  readonly documentId: DocumentId | null
  readonly queryText: string
  // nullable at creation — populated after AI generation
  answerText: string | null
  latencyMs: number | null
  retrievalMetadata: Record<string, unknown> | null
  readonly createdAt: Date
}

export type Message = {
  readonly role: 'user' | 'assistant' | 'warning'
  readonly content: string
  readonly sources?: readonly Source[]
  // Kept on the message so the confidence badge survives later exchanges —
  // the live AskResponse state only describes the newest answer.
  readonly retrievalQuality?: import('./api').RetrievalQuality
}

export type Source = {
  readonly content: string
  readonly score: number | null
  readonly metadata: Record<string, unknown>
  readonly citationId?: number  // [Source N] — matches inline citation in answer
}

export type LatencyBreakdown = {
  readonly retrievalMs: number
  readonly generationMs: number
  readonly totalMs: number
}

// ============================================================
// DERIVED TYPES
// ============================================================

// DocumentSummary — lightweight type for list views
// Avoids sending full document data when only summary is needed
export type DocumentSummary = Pick<
  Document,
  'id' | 'filename' | 'status' | 'chunkCount' | 'createdAt'
>

// CreateDocumentInput — strip fields the DB generates
// userId comes from auth context, never from request body
export type CreateDocumentInput = Omit<
  Document,
  'id' | 'createdAt' | 'updatedAt' | 'chunkCount' | 'status'
>

// CreateQueryInput — strip DB-generated fields
export type CreateQueryInput = Omit<
  Query,
  'id' | 'createdAt' | 'answerText' | 'latencyMs' | 'retrievalMetadata'
>

// UpdateDocumentInput — only mutable fields, all optional
// Cannot update id, userId (ownership), or createdAt (immutable timestamp)
export type UpdateDocumentInput = Partial<
  Pick<Document, 'status' | 'chunkCount' | 'updatedAt'>
>

// Memory — a long-term fact the AI has learned about the user
export type Memory = {
  readonly id: string
  readonly content: string
  readonly createdAt: string
  readonly lastAccessed: string
  readonly accessCount: number
  readonly similarity?: number
}