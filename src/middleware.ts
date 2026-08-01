/**
 * BISMARK ERP — Next.js Middleware (Edge Runtime)
 *
 * Phase 4: Security Hardening
 *
 * Protects all /api/v1/* routes with:
 *   1. JWT authentication (Phase 1)
 *   2. Security headers on ALL responses (Phase 4)
 *   3. CORS enforcement (Phase 4)
 *   4. Request size limit (Phase 4)
 *
 * Security headers applied to every response:
 *   - Content-Security-Policy
 *   - Strict-Transport-Security (HSTS)
 *   - X-Content-Type-Options: nosniff
 *   - X-Frame-Options: DENY
 *   - X-XSS-Protection: 1; mode=block
 *   - Referrer-Policy: strict-origin-when-cross-origin
 *   - Permissions-Policy
 *   - Cross-Origin-Opener-Policy: same-origin
 *   - Cross-Origin-Resource-Policy: same-origin
 *   - Cross-Origin-Embedder-Policy: require-corp
 *   - Cache-Control: no-store (for API responses)
 *   - X-Correlation-Id (LAW-61)
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyTokenEdge, extractBearerToken, PUBLIC_ROUTES } from '@/lib/auth/edge-jwt'

// ============================================================
// Security Headers
// ============================================================

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
}

// CORS: Only allow same-origin for API (no cross-origin API access in V1)
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': 'null', // No cross-origin access
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Idempotency-Key, X-Correlation-Id',
  'Access-Control-Max-Age': '86400', // 24h preflight cache
  'Access-Control-Allow-Credentials': 'false',
}

// Max request body size: 10MB (prevents large payload attacks)
const MAX_BODY_SIZE = 10 * 1024 * 1024

/**
 * Apply security + CORS headers to a response.
 */
function applySecurityHeaders(response: NextResponse, correlationId?: string): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value)
  }
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value)
  }
  // Correlation ID (LAW-61)
  response.headers.set('X-Correlation-Id', correlationId || crypto.randomUUID())
  return response
}

/**
 * Create a JSON error response with security headers.
 */
function securityJsonResponse(body: unknown, status: number): NextResponse {
  const response = NextResponse.json(body, { status })
  return applySecurityHeaders(response)
}

// ============================================================
// Middleware
// ============================================================

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only process /api/v1/* routes
  if (!pathname.startsWith('/api/v1/')) {
    return NextResponse.next()
  }

  // Handle CORS preflight (OPTIONS)
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 })
    return applySecurityHeaders(response)
  }

  // Request size check (Content-Length header)
  const contentLength = parseInt(request.headers.get('content-length') || '0', 10)
  if (contentLength > MAX_BODY_SIZE) {
    return securityJsonResponse(
      {
        type: 'https://docs.bismark.api/errors/payload-too-large',
        title: 'PAYLOAD_TOO_LARGE',
        status: 413,
        detail: `Request body exceeds maximum size of ${MAX_BODY_SIZE / 1024 / 1024}MB`,
        code: 'PAYLOAD_TOO_LARGE',
        correlation_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      },
      413,
    )
  }

  // Check if route is public
  const isPublic = PUBLIC_ROUTES.some((route) => {
    return pathname === route || pathname.startsWith(route + '/')
  })

  // Strip client-sent x-auth-* headers (prevent spoofing) — always
  const requestHeaders = new Headers(request.headers)
  requestHeaders.delete('x-auth-user-id')
  requestHeaders.delete('x-auth-tenant-id')
  requestHeaders.delete('x-auth-session-id')
  requestHeaders.delete('x-auth-user-type')
  requestHeaders.delete('x-auth-username')
  requestHeaders.delete('x-auth-roles')

  if (isPublic) {
    const response = NextResponse.next({ request: { headers: requestHeaders } })
    return applySecurityHeaders(response)
  }

  // Protected route — require authentication
  const authHeader = request.headers.get('authorization')
  const token = extractBearerToken(authHeader)

  if (!token) {
    return securityJsonResponse(
      {
        type: 'https://docs.bismark.api/errors/unauthorized',
        title: 'UNAUTHORIZED',
        status: 401,
        detail: 'Missing or invalid Authorization header. Expected: Bearer <token>',
        code: 'UNAUTHORIZED',
        correlation_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      },
      401,
    )
  }

  // Verify JWT
  const payload = await verifyTokenEdge(token)

  if (!payload) {
    return securityJsonResponse(
      {
        type: 'https://docs.bismark.api/errors/token-invalid',
        title: 'TOKEN_INVALID',
        status: 401,
        detail: 'Token is invalid, expired, or revoked. Please login again.',
        code: 'TOKEN_INVALID',
        correlation_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      },
      401,
    )
  }

  // Token valid — set verified auth headers
  requestHeaders.set('x-auth-user-id', payload.sub)
  requestHeaders.set('x-auth-tenant-id', payload.tenantId)
  requestHeaders.set('x-auth-session-id', payload.sessionId)
  requestHeaders.set('x-auth-user-type', payload.userType)
  requestHeaders.set('x-auth-username', payload.username)
  requestHeaders.set('x-auth-roles', payload.roles.join(','))

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  return applySecurityHeaders(response, payload.jti)
}

export const config = {
  matcher: ['/api/v1/:path*'],
}
