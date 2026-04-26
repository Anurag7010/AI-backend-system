import { NextRequest, NextResponse } from 'next/server'
// RequestContext is middleware infrastructure — stays here
// But UserId is a domain concept — import it
import type { UserId } from '../../types'

export interface RequestContext {
  requestId: string
  // Use branded UserId — prevents accidentally passing a raw string
  // where a userId is expected downstream
  userId?: UserId
  startTime: number
  parsedBody?: unknown
}

export type RouteHandler = (
  req: NextRequest,
  context: RequestContext
) => Promise<NextResponse>

export type Middleware = (handler: RouteHandler) => RouteHandler