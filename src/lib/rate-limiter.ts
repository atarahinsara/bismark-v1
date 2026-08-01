/**
 * RT-MED-004: In-Memory Rate Limiter
 *
 * Sliding window rate limiter for API endpoints.
 * In production, replace with Redis-backed implementation (SB-001).
 *
 * Usage:
 *   import { rateLimit } from '@/lib/rate-limiter'
 *   const result = rateLimit('auth:login', ipAddress, { maxRequests: 5, windowSeconds: 60 })
 *   if (!result.allowed) return 429
 */

interface RateLimitEntry {
  requests: number[] // timestamps of requests in current window
}

interface RateLimitConfig {
  maxRequests: number
  windowSeconds: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
  retryAfterSeconds: number
}

const store = new Map<string, RateLimitEntry>()

// Default rate limit rules
const DEFAULT_RULES: Record<string, RateLimitConfig> = {
  'auth:login': { maxRequests: 5, windowSeconds: 60 },     // 5 per minute
  'auth:refresh': { maxRequests: 10, windowSeconds: 60 },   // 10 per minute
  'api:default': { maxRequests: 100, windowSeconds: 60 },   // 100 per minute
}

/**
 * Check if a request is allowed under the rate limit.
 *
 * @param ruleName - Rule key (e.g., 'auth:login')
 * @param identifier - Unique identifier (IP address or userId)
 * @param config - Optional override config
 * @returns RateLimitResult
 */
export function rateLimit(
  ruleName: string,
  identifier: string,
  config?: RateLimitConfig,
): RateLimitResult {
  const cfg = config || DEFAULT_RULES[ruleName] || DEFAULT_RULES['api:default']
  const key = `${ruleName}:${identifier}`
  const now = Date.now()
  const windowStart = now - cfg.windowSeconds * 1000

  // Get or create entry
  let entry = store.get(key)
  if (!entry) {
    entry = { requests: [] }
    store.set(key, entry)
  }

  // Remove expired timestamps (sliding window)
  entry.requests = entry.requests.filter((ts) => ts > windowStart)

  // Check if allowed
  if (entry.requests.length >= cfg.maxRequests) {
    const oldestRequest = entry.requests[0]
    const resetAt = new Date(oldestRequest + cfg.windowSeconds * 1000)
    const retryAfterSeconds = Math.ceil((oldestRequest + cfg.windowSeconds * 1000 - now) / 1000)

    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfterSeconds: Math.max(1, retryAfterSeconds),
    }
  }

  // Allow — record this request
  entry.requests.push(now)

  return {
    allowed: true,
    remaining: cfg.maxRequests - entry.requests.length,
    resetAt: new Date(now + cfg.windowSeconds * 1000),
    retryAfterSeconds: 0,
  }
}

/**
 * Get client IP address from request.
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const realIP = request.headers.get('x-real-ip')
  if (realIP) return realIP
  return 'unknown'
}

/**
 * Create a 429 Too Many Requests response.
 */
export function rateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      type: 'https://docs.bismark.api/errors/rate-limited',
      title: 'RATE_LIMITED',
      status: 429,
      detail: `Too many requests. Retry after ${result.retryAfterSeconds} seconds.`,
      code: 'RATE_LIMITED',
      retry_after: result.retryAfterSeconds,
      reset_at: result.resetAt.toISOString(),
      correlation_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(result.retryAfterSeconds),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.floor(result.resetAt.getTime() / 1000)),
      },
    },
  )
}
