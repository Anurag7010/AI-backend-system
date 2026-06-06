import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { compose, withErrorHandler, withRequestId, withLogging, withAuth, withValidation } from '@/lib/middleware'
import { RequestContext } from '@/lib/middleware/types'
import { backendClient } from '@/lib/backend-client'
import { addSearchHistory } from '@/db/repositories/search-history'

const SearchSchema = z.object({
  query: z.string().min(1).max(500),
  topK: z.number().int().min(1).max(20).optional().default(10),
  strategy: z.enum(['semantic', 'hybrid', 'multi_query']).optional().default('semantic'),
  documentId: z.string().uuid().optional(),
})

type SearchBody = z.infer<typeof SearchSchema>

async function searchHandler(req: NextRequest, context: RequestContext): Promise<NextResponse> {
  const { query, topK, strategy } = context.parsedBody as SearchBody

  const results = await backendClient.retrieve(query, {
    topK,
    strategy,
    userId: context.userId,
    traceId: context.requestId,
  })

  // Fire-and-forget history recording
  if (context.userId) {
    addSearchHistory({
      userId: context.userId,
      query,
      resultCount: results.chunks.length,
    }).catch(() => {/* non-fatal */})
  }

  return NextResponse.json({
    query,
    results: results.chunks,
    count: results.chunks.length,
    strategy,
  })
}

const handler = compose(
  withErrorHandler,
  withRequestId,
  withLogging,
  withAuth({ required: true }),
  withValidation(SearchSchema)
)(searchHandler)

export async function POST(req: NextRequest) {
  return handler(req, { requestId: '', startTime: Date.now() })
}
