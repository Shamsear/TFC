/**
 * Error logging utility for server-side error tracking
 * Provides structured logging with context and timestamps
 * Can be integrated with monitoring services like Sentry
 */

export interface ErrorContext {
  userId?: string
  sessionId?: string
  route?: string
  method?: string
  body?: unknown
  query?: unknown
  [key: string]: unknown
}

export interface LogEntry {
  timestamp: string
  level: 'error' | 'warn' | 'info'
  message: string
  error?: {
    name: string
    message: string
    stack?: string
  }
  context?: ErrorContext
}

/**
 * Log an error with context and timestamp
 * In production, this can be extended to send to monitoring services
 * 
 * @param message - Human-readable error description
 * @param error - The error object or unknown error
 * @param context - Additional context about the error
 */
export function logError(
  message: string,
  error: unknown,
  context?: ErrorContext
): void {
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: 'error',
    message,
    context
  }

  // Extract error details if it's an Error object
  if (error instanceof Error) {
    logEntry.error = {
      name: error.name,
      message: error.message,
      stack: error.stack
    }
  } else if (error) {
    logEntry.error = {
      name: 'UnknownError',
      message: String(error)
    }
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${logEntry.timestamp}] ${message}`, {
      error: logEntry.error,
      context: logEntry.context
    })
  } else {
    // In production, log as JSON for structured logging
    console.error(JSON.stringify(logEntry))
  }

  // TODO: Integrate with monitoring service (e.g., Sentry)
  // if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
  //   Sentry.captureException(error, {
  //     contexts: {
  //       custom: context
  //     }
  //   })
  // }
}

/**
 * Log a warning with context
 * 
 * @param message - Human-readable warning description
 * @param context - Additional context about the warning
 */
export function logWarning(message: string, context?: ErrorContext): void {
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: 'warn',
    message,
    context
  }

  if (process.env.NODE_ENV === 'development') {
    console.warn(`[${logEntry.timestamp}] ${message}`, context)
  } else {
    console.warn(JSON.stringify(logEntry))
  }
}

/**
 * Log an info message with context
 * 
 * @param message - Human-readable info description
 * @param context - Additional context about the info
 */
export function logInfo(message: string, context?: ErrorContext): void {
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: 'info',
    message,
    context
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(`[${logEntry.timestamp}] ${message}`, context)
  } else {
    console.log(JSON.stringify(logEntry))
  }
}

/**
 * Extract error context from Next.js request
 * 
 * @param request - Next.js request object
 * @returns Error context object
 */
export function extractRequestContext(request: Request): ErrorContext {
  const url = new URL(request.url)
  
  return {
    route: url.pathname,
    method: request.method,
    query: Object.fromEntries(url.searchParams)
  }
}
