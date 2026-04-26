import { eq, desc } from 'drizzle-orm'
import db from '../connection'
import {
  documents,
  Document,
  NewDocument,
  DocumentStatus,
} from '../schema'

// ============================================================
// CREATE
// Called after file upload — before ingestion starts
// Status defaults to 'pending' via schema default
// ============================================================
export async function create(data: NewDocument): Promise<Document> {
  const [created] = await db
    .insert(documents)
    .values(data)
    // returning() gives us the full inserted row — including DB-generated fields
    // Without this we would need a second SELECT to get the created_at and id
    .returning()

  return created
}

// ============================================================
// FIND BY ID
// Returns null if not found — never throws
// Route handler decides whether to 404
// ============================================================
export async function findById(id: string): Promise<Document | null> {
  const [document] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, id))
    .limit(1)

  // Drizzle returns an array — destructure first element, undefined if empty
  return document ?? null
}

// ============================================================
// FIND BY USER
// All documents for a user — newest first
// ============================================================
export async function findByUser(userId: string): Promise<Document[]> {
  return db
    .select()
    .from(documents)
    .where(eq(documents.userId, userId))
    .orderBy(desc(documents.createdAt))
}

// ============================================================
// UPDATE STATUS
// Called by ingestion pipeline after processing completes or fails
// Always updates updatedAt — Drizzle does not do this automatically
// ============================================================
export async function updateStatus(
  id: string,
  status: DocumentStatus,
  chunkCount?: number
): Promise<Document | null> {
  const [updated] = await db
    .update(documents)
    .set({
      status,
      // Only update chunkCount if provided — spread avoids overwriting with undefined
      ...(chunkCount !== undefined ? { chunkCount } : {}),
      // Manual updatedAt — PostgreSQL won't do this automatically without a trigger
      updatedAt: new Date(),
    })
    .where(eq(documents.id, id))
    .returning()

  return updated ?? null
}

// ============================================================
// DELETE
// Returns true if a row was deleted, false if not found
// Cascade in schema handles related queries automatically
// ============================================================
export async function deleteDocument(id: string): Promise<boolean> {
  const result = await db
    .delete(documents)
    .where(eq(documents.id, id))
    .returning({ id: documents.id })

  return result.length > 0
}