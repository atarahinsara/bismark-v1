/**
 * BISMARK ERP — Edge-Compatible JWT Verification
 *
 * This module is used by Next.js middleware (Edge Runtime).
 * It uses Web Crypto API instead of Node.js crypto.
 *
 * The full JWT creation/signing is in jwt.ts (Node.js runtime).
 * This module only handles verification (for middleware use).
 */

// Same secret logic as jwt.ts
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable is required in production')
    }
    return 'bismark-dev-secret-change-in-production-01910000'
  }
  return secret
}

function base64UrlDecodeToString(str: string): string {
  // Convert base64url to base64
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  // Add padding
  while (base64.length % 4) base64 += '='
  // Decode
  const binary = atob(base64)
  return binary
}

function base64UrlToArrayBuffer(str: string): ArrayBuffer {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4) base64 += '='
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

export interface EdgeJwtPayload {
  sub: string
  tenantId: string
  sessionId: string
  userType: string
  username: string
  displayName: string
  roles: string[]
  iat: number
  exp: number
  jti: string
}

/**
 * Verify a JWT token in Edge Runtime.
 * Returns the payload if valid, null if invalid/expired.
 */
export async function verifyTokenEdge(token: string): Promise<EdgeJwtPayload | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const [headerB64, payloadB64, signatureB64] = parts
    const data = `${headerB64}.${payloadB64}`

    // Import key for HMAC verification
    const secret = getJwtSecret()
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    )

    // Verify signature
    const signature = base64UrlToArrayBuffer(signatureB64)
    const dataBuffer = encoder.encode(data)
    const isValid = await crypto.subtle.verify('HMAC', key, signature, dataBuffer)

    if (!isValid) return null

    // Decode payload
    const payloadStr = base64UrlDecodeToString(payloadB64)
    const payload = JSON.parse(payloadStr) as EdgeJwtPayload

    // Check expiration
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp < now) return null

    return payload
  } catch {
    return null
  }
}

/**
 * Extract Bearer token from Authorization header.
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  return match ? match[1] : null
}

/**
 * Routes that don't require authentication.
 */
export const PUBLIC_ROUTES = [
  '/api/v1/auth/login',
  '/api/v1/auth/refresh',
  '/api/v1/auth/register',
  '/api/v1/auth/verify-email',
  '/api/v1/auth/resend-verification',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/reset-password',
  '/api/v1/captcha/challenge',
  '/api/v1/system/health',
  '/api/metrics', // T-2-10: Prometheus metrics (IP-restricted in route)
]
