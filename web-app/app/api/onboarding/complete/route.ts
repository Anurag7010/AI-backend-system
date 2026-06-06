import { NextRequest, NextResponse } from 'next/server'
import {
  compose,
  withErrorHandler,
  withRequestId,
  withLogging,
  withAuth,
} from '@/lib/middleware'
import { RequestContext } from '@/lib/middleware/types'
import { markOnboardingComplete } from '@/db/repositories/users'

async function handler(
  req: NextRequest,
  context: RequestContext,
): Promise<NextResponse> {
  await markOnboardingComplete(context.userId!)
  return NextResponse.json({ ok: true })
}

const wrapped = compose(
  withErrorHandler, withRequestId, withLogging, withAuth({ required: true })
)(handler)

export async function POST(req: NextRequest) {
  return wrapped(req, { requestId: '', startTime: 0 })
}
