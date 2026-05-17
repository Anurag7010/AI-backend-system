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
import { documentsRepository } from '@/db'

const CreateDocumentSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
})

// GET — list all documents for authenticated user
async function listHandler(
  req: NextRequest,
  context: RequestContext
): Promise<NextResponse> {
  const docs = await documentsRepository.findByUser(context.userId!)

  // Always 200 with array — empty array is not a 404
  return NextResponse.json({ data: docs, requestId: context.requestId })
}

// POST — create document record before ingestion
async function createHandler(
  req: NextRequest,
  context: RequestContext
): Promise<NextResponse> {
  const body = context.parsedBody as z.infer<typeof CreateDocumentSchema>

  const document = await documentsRepository.create({
    userId: context.userId!,
    filename: body.filename,
    // status and chunkCount use schema defaults: 'pending' and 0
  })

  return NextResponse.json(
    { data: document, requestId: context.requestId },
    {
      status: 201,
      headers: {
        // Location header tells client where to find the created resource
        Location: `/api/documents/${document.id}`,
      },
    }
  )
}

const getHandler = compose(
  withErrorHandler,
  withRequestId,
  withLogging,
  withAuth({ required: true })
)(listHandler)

const postHandler = compose(
  withErrorHandler,
  withRequestId,
  withLogging,
  withAuth({ required: true }),
  withValidation(CreateDocumentSchema)
)(createHandler)

export async function GET(req: NextRequest) {
  return getHandler(req, { requestId: '', startTime: 0 })
}

export async function POST(req: NextRequest) {
  return postHandler(req, { requestId: '', startTime: 0 })
}