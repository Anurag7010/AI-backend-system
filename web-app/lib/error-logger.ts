// Centralized error logging.
// Development: full error details to console.
// Production: this is where Sentry/Datadog integration would go.
// Called from: app/error.tsx, BaseService catch block, withErrorHandler middleware.

interface ErrorContext {
  userId?: string
  requestId?: string
  route?: string
  [key: string]: unknown
}

export function logError(error: Error, context?: ErrorContext): void {
  if (process.env.NODE_ENV === 'production') {
    // TODO Day 17+: send to Sentry/Datadog with context
    return
  }

  console.error('[error-logger]', {
    message: error.message,
    name: error.name,
    stack: error.stack,
    ...context,
  })
}

export function logWarning(message: string, context?: ErrorContext): void {
  if (process.env.NODE_ENV === 'production') {
    // TODO Day 17+: send to monitoring service
    return
  }

  console.warn('[error-logger]', { message, ...context })
}
