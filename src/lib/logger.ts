/**
 * BISMARK ERP — Structured Logger (T-2-08)
 *
 * Replaces scattered console.log/error with structured JSON logging.
 * In production: logs are JSON for Loki/ELK aggregation.
 * In development: logs are pretty-printed for readability.
 *
 * PII is redacted automatically (T-2-18 alignment).
 */

import pino from 'pino'

const isProduction = process.env.NODE_ENV === 'production'
const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug')

/**
 * Custom redaction paths — PII fields are never logged.
 * Aligns with T-2-18 (PII Encryption) — defense in depth.
 */
const redactPaths = [
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'mfaSecret',
  'apiKey',
  'authorization',
  '*.password',
  '*.passwordHash',
  '*.token',
  '*.accessToken',
  '*.refreshToken',
  '*.secret',
  '*.mfaSecret',
  '*.apiKey',
  'req.headers.authorization',
  'req.headers.cookie',
]

/**
 * BISMARK Structured Logger
 *
 * Usage:
 *   import { logger } from '@/lib/logger'
 *   logger.info({ userId, action: 'login' }, 'User logged in')
 *   logger.error({ err, userId }, 'Login failed')
 *   logger.warn({ sessionId }, 'Session expired')
 */
export const logger = pino({
  level: logLevel,
  redact: {
    paths: redactPaths,
    censor: '[REDACTED]',
  },
  base: {
    service: 'bismark-api',
    version: process.env.npm_package_version || '1.0.0',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname,service,version',
          },
        },
      }),
})

/**
 * Create a child logger with additional context (e.g., request-scoped).
 *
 * Usage:
 *   const reqLogger = logger.child({ requestId, userId, tenantId })
 *   reqLogger.info('Processing order')
 */
export function createLogger(context: Record<string, unknown>) {
  return logger.child(context)
}

/**
 * Request-scoped logger — uses AsyncLocalStorage to propagate context
 * without explicit parameter passing.
 *
 * Usage in middleware:
 *   import { runWithLogger, getRequestLogger } from '@/lib/logger'
 *   await runWithLogger({ requestId, userId }, async () => { ... })
 *
 * Usage in route:
 *   const log = getRequestLogger()
 *   log.info({ orderId }, 'Order created')
 */
import { AsyncLocalStorage } from 'async_hooks'

interface LogContext {
  requestId?: string
  userId?: string
  tenantId?: string
  sessionId?: string
  [key: string]: unknown
}

const logContextStorage = new AsyncLocalStorage<LogContext>()

export function runWithLogger<T>(context: LogContext, fn: () => Promise<T>): Promise<T> {
  return logContextStorage.run(context, fn)
}

export function setLogContext(key: string, value: unknown): void {
  const store = logContextStorage.getStore()
  if (store) {
    store[key] = value
  }
}

export function getRequestLogger(): pino.Logger {
  const context = logContextStorage.getStore() || {}
  return logger.child(context)
}
