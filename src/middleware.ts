/**
 * BISMARK ERP — Next.js Middleware (Edge Runtime)
 *
 * Protects all /api/v1/* routes with JWT authentication.
 * Public routes (auth/login, auth/refresh, system/health) are exempt.
 *
 * Flow:
 *   1. Request arrives at /api/v1/*
 *   2. If route is public → pass through
 *   3. If not public → extract Bearer token from Authorization header
 *   4. Verify JWT signature + expiration (Edge-compatible Web Crypto API)
 *   5. If valid → set x-auth-* headers for downstream API routes
 *   6. If invalid → return 401 Unauthorized
 *
 * Security:
 *   - Strips any client-sent x-auth-* headers (prevents spoofing)
 *   - Uses timing-safe comparison via Web Crypto API
 *   - Does NOT query database (stateless — session DB check happens in API route)
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyTokenEdge, extractBearerToken, PUBLIC_ROUTES } from '@/lib/auth/edge-jwt'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only protect /api/v1/* routes
  if (!pathname.startsWith('/api/v1/')) {
    return NextResponse.next()
  }

  // Check if route is public
  const isPublic = PUBLIC_ROUTES.some((route) => {
    // Match exact path or path with trailing segments
    // e.g., /api/v1/auth/login matches /api/v1/auth/login
    // but /api/v1/auth/login/something also matches (lenient)
    return pathname === route || pathname.startsWith(route + '/')
  })

  if (isPublic) {
    // Still strip auth headers for public routes (security)
    const requestHeaders = new Headers(request.headers)
    requestHeaders.delete('x-auth-user-id')
    requestHeaders.delete('x-auth-tenant-id')
    requestHeaders.delete('x-auth-session-id')
    requestHeaders.delete('x-auth-user-type')
    requestHeaders.delete('x-auth-username')
    requestHeaders.delete('x-auth-roles')
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  // Protected route — require authentication
  const authHeader = request.headers.get('authorization')
  const token = extractBearerToken(authHeader)

  if (!token) {
    return NextResponse.json(
      {
        type: 'https://docs.bismark.api/errors/unauthorized',
        title: 'UNAUTHORIZED',
        status: 401,
        detail: 'Missing or invalid Authorization header. Expected: Bearer <token>',
        code: 'UNAUTHORIZED',
        correlation_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      },
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // Verify JWT
  const payload = await verifyTokenEdge(token)

  if (!payload) {
    return NextResponse.json(
      {
        type: 'https://docs.bismark.api/errors/token-invalid',
        title: 'TOKEN_INVALID',
        status: 401,
        detail: 'Token is invalid, expired, or revoked. Please login again.',
        code: 'TOKEN_INVALID',
        correlation_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      },
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // Token is valid — set auth headers for downstream API routes
  // CRITICAL: Strip any client-sent x-auth-* headers first (prevent spoofing)
  const requestHeaders = new Headers(request.headers)
  requestHeaders.delete('x-auth-user-id')
  requestHeaders.delete('x-auth-tenant-id')
  requestHeaders.delete('x-auth-session-id')
  requestHeaders.delete('x-auth-user-type')
  requestHeaders.delete('x-auth-username')
  requestHeaders.delete('x-auth-roles')

  // Set verified auth headers
  requestHeaders.set('x-auth-user-id', payload.sub)
  requestHeaders.set('x-auth-tenant-id', payload.tenantId)
  requestHeaders.set('x-auth-session-id', payload.sessionId)
  requestHeaders.set('x-auth-user-type', payload.userType)
  requestHeaders.set('x-auth-username', payload.username)
  requestHeaders.set('x-auth-roles', payload.roles.join(','))

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  // Only run middleware on API routes
  matcher: ['/api/v1/:path*'],
}
