/**
 * BISMARK ERP — Edge-Compatible JWT Verification
 *
 * Used by Next.js middleware (Edge Runtime).
 * Uses Web Crypto API instead of Node.js crypto.
 */

// Public routes that don't require authentication
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
  '/api/metrics',
]

export interface EdgeJwtPayload {
  sub: string
  tenantId: string
  sessionId: string
  userType: string
  username: string
  roles: string[]
  iat: number
  exp: number
  jti: string
}

function getJwtSecret(): string {
  return process.env.JWT_SECRET || 'bismark-dev-secret-change-in-production-01910000'
}

export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  return match ? match[1] : null
}

function base64UrlDecode(str: string): string {
  const padded = str + '='.repeat((4 - str.length % 4) % 4)
  const b64 = padded.replace(/-/g, '+').replace(/_/g, '/')
  return atob(b64)
}

function base64UrlToArrayBuffer(str: string): ArrayBuffer {
  const padded = str + '='.repeat((4 - str.length % 4) % 4)
  const b64 = padded.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

export async function verifyTokenEdge(token: string): Promise<EdgeJwtPayload | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const headerB64 = parts[0]
    const payloadB64 = parts[1]
    const signatureB64 = parts[2]
    const data = headerB64 + '.' + payloadB64

    const secret = getJwtSecret()
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    )

    const signature = base64UrlToArrayBuffer(signatureB64)
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      encoder.encode(data),
    )

    if (!isValid) return null

    const payloadStr = base64UrlDecode(payloadB64)
    const payload = JSON.parse(payloadStr) as EdgeJwtPayload

    if (payload.exp && Date.now() / 1000 > payload.exp) return null

    return payload
  } catch {
    return null
  }
}
