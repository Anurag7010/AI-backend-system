import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  compose,
  withErrorHandler,
  withRequestId,
  withLogging,
  withAuth,
  withValidation,
} from '@/lib/middleware'
import { RequestContext } from '@/lib/middleware/types'
import { queriesRepository } from '@/db'
import { backendClient } from '@/lib/backend-client'
import { BackendError, mapBackendError } from '@/lib/backend-error-mapper'
import { logError } from '@/lib/error-logger'
import { getConversationMessages, addMessage } from '@/db/repositories/messages'
import { findConversationById, updateConversationTitle } from '@/db/repositories/conversations'
import { MAX_QUERY_LENGTH } from '@/lib/constants'

const AskSchema = z.object({
  query: z.string().min(1, 'Query is required').max(MAX_QUERY_LENGTH),
  topK: z.number().int().min(1).max(20).optional().default(5),
  strategy: z.enum(['semantic', 'hybrid', 'multi_query', 'rrf']).optional().default('semantic'),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional().default([]),
  documentId: z.string().uuid().optional(),
  conversationId: z.string().uuid().optional(),
})

// Persist a completed user/assistant exchange to the conversation, auto-title it,
// and trigger memory extraction — mirrors the non-streaming /api/ask behavior.
async function persistConversationTurn(
  conversation: { id: string; title: string | null },
  userId: string,
  query: string,
  answer: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<void> {
  await addMessage({ conversationId: conversation.id, role: 'user', content: query, tokenCount: 0 })
  await addMessage({ conversationId: conversation.id, role: 'assistant', content: answer, tokenCount: 0 })

  if (conversation.title === 'New Conversation') {
    await updateConversationTitle(conversation.id, userId, query.slice(0, 50))
  }

  // Awaited (caller runs in the stream's flush): the Python endpoint queues the
  // actual extraction as a background task, so this returns quickly.
  const aiBackendUrl = process.env.AI_BACKEND_URL ?? ''
  await fetch(`${aiBackendUrl}/memories/extract`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.AI_BACKEND_API_KEY ?? '',
    },
    body: JSON.stringify({
      user_id: userId,
      messages: [
        ...history,
        { role: 'user', content: query },
        { role: 'assistant', content: answer },
      ],
    }),
  }).catch(() => { /* non-fatal */ })
}

async function streamHandler(
  req: NextRequest,
  context: RequestContext
): Promise<NextResponse> {
  const body = context.parsedBody as z.infer<typeof AskSchema>
  const { userId } = context
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  // Resolve the conversation up front: ownership is enforced here so a caller
  // cannot write messages into another user's conversation.
  const conversation = body.conversationId
    ? await findConversationById(body.conversationId, userId)
    : null
  if (body.conversationId && !conversation) {
    return NextResponse.json(
      { error: 'NOT_FOUND', message: 'Conversation not found', requestId: context.requestId },
      { status: 404 }
    )
  }

  // DB history takes precedence over history in the request body — same as /api/ask
  let effectiveHistory = body.history
  if (conversation) {
    const dbMessages = await getConversationMessages(conversation.id, 100)
    if (dbMessages.length > 0) {
      effectiveHistory = dbMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))
    }
  }

  const queryRecord = await queriesRepository.create({
    userId,
    queryText: body.query,
    documentId: body.documentId ?? null,
  })

  let pythonStream: ReadableStream<Uint8Array>
  try {
    pythonStream = await backendClient.askStream(body.query, {
      topK: body.topK,
      strategy: body.strategy,
      history: effectiveHistory,
      traceId: context.requestId,
      userId,
      userEmail: context.email,
    })
  } catch (err) {
    const serviceError = err instanceof BackendError ? mapBackendError(err) : mapBackendError(err)
    await queriesRepository.updateAnswer(queryRecord.id, '', 0, { error: serviceError.code })
    return NextResponse.json(
      {
        error: serviceError.code,
        message: serviceError.message,
        requestId: context.requestId,
        timestamp: new Date().toISOString(),
      },
      { status: 502 }
    )
  }

  // TransformStream intercepts done events to persist the answer while passing
  // all bytes through unchanged. Buffer by \n\n to handle SSE events split across chunks.
  // Persistence happens in flush(), not transform(): the response stream cannot close
  // until flush resolves, so the serverless function stays alive until the DB writes
  // land. Fire-and-forget writes here raced function freeze and lost messages.
  let lineBuffer = ''
  let accumulatedAnswer = ''
  let doneLatencyMs = 0
  let doneTraceId = ''
  let sawDone = false

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      lineBuffer += new TextDecoder().decode(chunk)
      const parts = lineBuffer.split('\n\n')
      lineBuffer = parts.pop() ?? ''

      for (const part of parts) {
        const trimmed = part.trim()
        if (!trimmed.startsWith('data: ')) continue
        try {
          const data = JSON.parse(trimmed.slice(6)) as Record<string, unknown>
          if (data['type'] === 'token' && typeof data['content'] === 'string') {
            accumulatedAnswer += data['content']
          } else if (data['type'] === 'done') {
            sawDone = true
            doneLatencyMs = typeof data['latency_ms'] === 'number' ? Math.round(data['latency_ms']) : 0
            doneTraceId = typeof data['trace_id'] === 'string' ? data['trace_id'] : ''
          }
        } catch {
          // Malformed JSON event — pass through unchanged
        }
      }
      controller.enqueue(chunk)
    },
    async flush() {
      if (!sawDone) return
      try {
        await queriesRepository.updateAnswer(
          queryRecord.id, accumulatedAnswer, doneLatencyMs, { traceId: doneTraceId }
        )
        if (conversation) {
          await persistConversationTurn(
            conversation, userId, body.query, accumulatedAnswer, effectiveHistory
          )
        }
      } catch (err: unknown) {
        logError(err instanceof Error ? err : new Error(String(err)))
      }
    },
  })

  // Pipe Python stream through transform; errors in the pipe are logged, not thrown
  pythonStream.pipeTo(writable).catch((err: unknown) => logError(err instanceof Error ? err : new Error(String(err))))

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Request-ID': context.requestId,
    },
  }) as unknown as NextResponse
}

const postHandler = compose(
  withErrorHandler,
  withRequestId,
  withLogging,
  withAuth({ required: true }),
  withValidation(AskSchema)
)(streamHandler)

export async function POST(req: NextRequest) {
  return postHandler(req, { requestId: '', startTime: 0 })
}
