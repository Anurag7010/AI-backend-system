import { NextRequest, NextResponse } from 'next/server'
import {
  compose,
  withErrorHandler,
  withRequestId,
  withLogging,
  withAuth,
} from '@/lib/middleware'
import { RequestContext } from '@/lib/middleware/types'
import { backendClient } from '@/lib/backend-client'
import { BackendError, mapBackendError } from '@/lib/backend-error-mapper'

// GET /api/retrieve?query=...&top_k=...&strategy=...
// Proxies to Python /retrieve. Auth required.
// Useful for debugging retrieval separately from generation.

async function retrieveHandler(
  req: NextRequest,
  context: RequestContext
): Promise<NextResponse> {
  const { searchParams } = req.nextUrl
  const query = searchParams.get('query')
  const topK = parseInt(searchParams.get('top_k') ?? '5', 10)
  const strategy = searchParams.get('strategy') ?? 'semantic'

  if (!query) {
    return NextResponse.json(
      {
        error: 'VALIDATION_ERROR',
        message: 'query parameter is required',
        requestId: context.requestId,
        timestamp: new Date().toISOString(),
      },
      { status: 422 }
    )
  }

  try {
    const result = await backendClient.retrieve(query, {
      topK: isNaN(topK) ? 5 : topK,
      strategy,
      traceId: context.requestId,
    })
    return NextResponse.json({ data: result, requestId: context.requestId })
  } catch (err) {
    const serviceError = err instanceof BackendError
      ? mapBackendError(err)
      : mapBackendError(err)

    return NextResponse.json(
      {
        error: serviceError.code,
        message: serviceError.message,
        requestId: context.requestId,
        timestamp: new Date().toISOString(),
      },
      { status: serviceError.status ?? 502 }
    )
  }
}

const handler = compose(
  withErrorHandler,
  withRequestId,
  withLogging,
  withAuth({ required: true })
)(retrieveHandler)

export async function GET(req: NextRequest) {
  return handler(req, { requestId: '', startTime: 0 })
}
