/**
 * BISMARK ERP — JWT Utility (HMAC-SHA256)
 *
 * Uses Node.js built-in crypto — no external JWT library needed.
 *
 * Token structure:
 *   header.payload.signature
 *
 * Header:  {"alg":"HS256","typ":"JWT"}
 * Payload: {sub, tenantId, sessionId, userType, roles, iat, exp, jti}
 * Signature: HMAC-SHA256(secret, header.payload)
 *
 * LAW-61: jti (JWT ID) is used as correlationId for distributed tracing.
 */

import crypto from 'crypto'

const ALGORITHM = 'HS256'
const TOKEN_TYPE = 'JWT'

/**
 * Default JWT secret — MUST be overridden in production via JWT_SECRET env var.
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    // Development fallback — NOT for production
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable is required in production')
    }
    return 'bismark-dev-secret-change-in-production-01910000'
  }
  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long')
  }
  return secret
}

// Token expiration times
export const ACCESS_TOKEN_EXPIRY_SECONDS = 900 // 15 minutes
export const REFRESH_TOKEN_EXPIRY_SECONDS = 604800 // 7 days
export const SESSION_ABSOLUTE_EXPIRY_SECONDS = 28800 // 8 hours (absolute timeout)

export interface JwtPayload {
  sub: string // user ID
  tenantId: string
  sessionId: string
  userType: string
  username: string
  displayName: string
  roles: string[] // role keys
  iat: number // issued at (unix timestamp)
  exp: number // expiration (unix timestamp)
  jti: string // JWT ID (unique per token — for revocation + correlation)
}

export interface JwtRefreshPayload {
  sub: string // user ID
  sessionId: string
  iat: number
  exp: number
  jti: string
}

function base64UrlEncode(data: string | Buffer): string {
  const buf = typeof data === 'string' ? Buffer.from(data) : data
  return buf.toString('base64url')
}

function base64UrlDecode(data: string): string {
  return Buffer.from(data, 'base64url').toString('utf8')
}

function sign(data: string): string {
  return crypto.createHmac('sha256', getJwtSecret()).update(data).digest('base64url')
}

/**
 * Create a signed JWT access token.
 */
export function createAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp' | 'jti'>): {
  token: string
  payload: JwtPayload
} {
  const now = Math.floor(Date.now() / 1000)
  const jti = crypto.randomUUID()
  const fullPayload: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + ACCESS_TOKEN_EXPIRY_SECONDS,
    jti,
  }

  const header = base64UrlEncode(JSON.stringify({ alg: ALGORITHM, typ: TOKEN_TYPE }))
  const payloadStr = base64UrlEncode(JSON.stringify(fullPayload))
  const signature = sign(`${header}.${payloadStr}`)

  return {
    token: `${header}.${payloadStr}.${signature}`,
    payload: fullPayload,
  }
}

/**
 * Create a signed JWT refresh token.
 * Refresh tokens have less payload but longer expiry.
 */
export function createRefreshToken(userId: string, sessionId: string): {
  token: string
  payload: JwtRefreshPayload
} {
  const now = Math.floor(Date.now() / 1000)
  const jti = crypto.randomUUID()
  const payload: JwtRefreshPayload = {
    sub: userId,
    sessionId,
    iat: now,
    exp: now + REFRESH_TOKEN_EXPIRY_SECONDS,
    jti,
  }

  const header = base64UrlEncode(JSON.stringify({ alg: ALGORITHM, typ: TOKEN_TYPE }))
  const payloadStr = base64UrlEncode(JSON.stringify(payload))
  const signature = sign(`${header}.${payloadStr}`)

  return {
    token: `${header}.${payloadStr}.${signature}`,
    payload,
  }
}

/**
 * Verify a JWT token (access or refresh).
 * Returns the decoded payload if valid, throws if invalid/expired.
 */
export function verifyToken<T = JwtPayload>(token: string): T {
  const parts = token.split('.')
  if (parts.length !== 3) {
    throw new Error('Invalid token format')
  }

  const [header, payloadStr, signature] = parts

  // Verify signature
  const expectedSignature = sign(`${header}.${payloadStr}`)
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    throw new Error('Invalid token signature')
  }

  // Decode header
  const headerData = JSON.parse(base64UrlDecode(header))
  if (headerData.alg !== ALGORITHM || headerData.typ !== TOKEN_TYPE) {
    throw new Error('Invalid token header')
  }

  // Decode payload
  const payload = JSON.parse(base64UrlDecode(payloadStr)) as T & { exp: number }

  // Check expiration
  const now = Math.floor(Date.now() / 1000)
  if (payload.exp < now) {
    throw new Error('Token expired')
  }

  return payload
}

/**
 * Hash a token for storage (for revocation lookup).
 * Uses SHA-256 so the stored hash cannot be reversed to get the token.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Extract the Bearer token from an Authorization header.
 * Returns null if missing or malformed.
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  return match ? match[1] : null
}
