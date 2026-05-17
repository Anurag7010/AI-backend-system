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
import { aiService } from '@/services/ai-service'

const CreateQuerySchema = z.object({
  query: z.string().min(1, 'Query is required'),
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
  const body = context.parsedBody as z.infer<typeof CreateQuerySchema>

  // Create query record immediately — captures the question before AI runs
  // This way we have a record even if AI fails
  const queryRecord = await queriesRepository.create({
    userId: context.userId!,
    queryText: body.query,
    documentId: body.documentId ?? null,
  })

  // Call AI backend
  const aiResponse = await aiService.ask({
    query: body.query,
    history: [],
  })

  if (aiResponse.error) {
    // AI failed — update record to reflect failure, return 502
    // Query record is preserved with empty answer for audit trail
    await queriesRepository.updateAnswer(
      queryRecord.id,
      '',
      0,
      { error: aiResponse.error.code }
    )

    return NextResponse.json(
      {
        error: 'AI_BACKEND_ERROR',
        message: 'AI service failed to generate a response',
        requestId: context.requestId,
        timestamp: new Date().toISOString(),
      },
      { status: 502 }
    )
  }

  // Update record with answer
  const updated = await queriesRepository.updateAnswer(
    queryRecord.id,
    aiResponse.data!.answer,
    aiResponse.latencyMs,
    { sources: aiResponse.data!.sources }
  )

  return NextResponse.json(
    { data: updated, requestId: context.requestId },
    { status: 201 }
  )
}

const getHandler = compose(
  withErrorHandler, withRequestId, withLogging, withAuth({ required: true })
)(listHandler)

const postHandler = compose(
  withErrorHandler, withRequestId, withLogging,
  withAuth({ required: true }),
  withValidation(CreateQuerySchema)
)(createHandler)

export async function GET(req: NextRequest) {
  return getHandler(req, { requestId: '', startTime: 0 })
}
export async function POST(req: NextRequest) {
  return postHandler(req, { requestId: '', startTime: 0 })
}