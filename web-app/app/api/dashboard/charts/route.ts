import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { compose, withErrorHandler, withRequestId, withAuth } from '@/lib/middleware'
import { RequestContext } from '@/lib/middleware/types'
import { getDashboardCharts } from '@/lib/dashboard-charts'

async function chartsHandler(req: NextRequest, context: RequestContext): Promise<NextResponse> {
  const { userId } = context
  if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const charts = await getDashboardCharts(userId)

  return NextResponse.json(
    charts,
    { headers: { 'Cache-Control': 'private, max-age=60' } }
  )
}

const handler = compose(
  withErrorHandler,
  withRequestId,
  withAuth({ required: true })
)(chartsHandler)

export async function GET(req: NextRequest) {
  return handler(req, { requestId: '', startTime: Date.now() })
}
