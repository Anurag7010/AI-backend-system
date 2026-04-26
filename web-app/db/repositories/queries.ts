import { eq, desc } from 'drizzle-orm'
import db from '../connection'
import { queries, Query, NewQuery } from '../schema'

// ============================================================
// CREATE
// Called when user submits a question — before AI generation
// answerText and latencyMs are null at this point
// ============================================================
export async function create(data: NewQuery): Promise<Query> {
  const [created] = await db
    .insert(queries)
    .values(data)
    .returning()

  return created
}

// ============================================================
// FIND BY USER
// Query history for a user — newest first, capped at limit
// Default limit 50 — prevents unbounded result sets
// ============================================================
export async function findByUser(
  userId: string,
  limit = 50
): Promise<Query[]> {
  return db
    .select()
    .from(queries)
    .where(eq(queries.userId, userId))
    .orderBy(desc(queries.createdAt))
    .limit(limit)
}

// ============================================================
// FIND BY DOCUMENT
// All queries against a specific document — for document detail view
// ============================================================
export async function findByDocument(documentId: string): Promise<Query[]> {
  return db
    .select()
    .from(queries)
    .where(eq(queries.documentId, documentId))
    .orderBy(desc(queries.createdAt))
}

// ============================================================
// UPDATE ANSWER
// Called after AI generation completes
// Populates answerText, latencyMs, retrievalMetadata
// ============================================================
export async function updateAnswer(
  id: string,
  answer: string,
  latencyMs: number,
  retrievalMetadata: Record<string, unknown>
): Promise<Query | null> {
  const [updated] = await db
    .update(queries)
    .set({
      answerText: answer,
      latencyMs,
      // jsonb column accepts any serializable object
      retrievalMetadata,
    })
    .where(eq(queries.id, id))
    .returning()

  return updated ?? null
}