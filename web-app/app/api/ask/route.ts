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

const AskSchema = z.object({
  query: z.string().min(1, 'Query is required').max(2000),
  topK: z.number().int().min(1).max(20).optional().default(5),
  strategy: z.enum(['semantic', 'hybrid', 'multi_query', 'rrf']).optional().default('semantic'),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional().default([]),
  documentId: z.string().uuid().optional(),
})

async function listHandler(
  req: NextRequest,
  context: RequestContext
): Promise<NextResponse> {
  const { searchParams } = req.nextUrl
  const documentId = searchParams.get('documentId')

  const results = documentId
    ? await queriesRepository.findByDocument(documentId)
    : await queriesRepository.findByUser(context.userId!)

  return NextResponse.json({ data: results, requestId: context.requestId })
}

async function createHandler(
  req: NextRequest,
  context: RequestContext
): Promise<NextResponse> {
  const body = context.parsedBody as z.infer<typeof AskSchema>

  // Create query record before AI call — we have a record even if AI fails
  const queryRecord = await queriesRepository.create({
    userId: context.userId!,
    queryText: body.query,
    documentId: body.documentId ?? null,
  })

  try {
    const aiResponse = await backendClient.ask(body.query, {
      topK: body.topK,
      strategy: body.strategy,
      history: body.history,
      traceId: context.requestId,
    })

    // Persist answer and latency for query history
    await queriesRepository.updateAnswer(
      queryRecord.id,
      aiResponse.answer,
      aiResponse.latencyBreakdown.totalMs,
      { sources: aiResponse.sources, traceId: aiResponse.traceId }
    )

    // Return AskResponse directly — the browser needs the AI answer, not the DB record
    return NextResponse.json(aiResponse, { status: 200 })

  } catch (err) {
    const serviceError = err instanceof BackendError
      ? mapBackendError(err)
      : mapBackendError(err)

    // Persist failure so query history reflects the error
    await queriesRepository.updateAnswer(
      queryRecord.id,
      '',
      0,
      { error: serviceError.code }
    )

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
}

const getHandler = compose(
  withErrorHandler, withRequestId, withLogging, withAuth({ required: true })
)(listHandler)

const postHandler = compose(
  withErrorHandler, withRequestId, withLogging,
  withAuth({ required: true }),
  withValidation(AskSchema)
)(createHandler)

export async function GET(req: NextRequest) {
  return getHandler(req, { requestId: '', startTime: 0 })
}
export async function POST(req: NextRequest) {
  return postHandler(req, { requestId: '', startTime: 0 })
}
