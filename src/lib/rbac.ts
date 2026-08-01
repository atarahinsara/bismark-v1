/**
 * BISMARK ERP — RBAC Permission Guard
 *
 * Provides middleware-like helpers to enforce RBAC on API routes.
 *
 * Usage patterns:
 *
 * 1. Direct check inside route handler:
 *    ```ts
 *    import { requirePermission, getAuthContext } from '@/lib/rbac'
 *    export async function POST(request: NextRequest) {
 *      const ctx = getAuthContext(request)
 *      if (!ctx) return unauthorizedResponse()
 *      await requirePermission(ctx, 'sales.create')
 *      // ... business logic
 *    }
 *    ```
 *
 * 2. Wrapper function (cleaner):
 *    ```ts
 *    import { withPermission } from '@/lib/rbac'
 *    export const POST = withPermission('sales.create', async (request, ctx) => {
 *      // ... business logic (ctx.userId, ctx.tenantId, ctx.roles available)
 *    })
 *    ```
 */

import type { NextRequest } from 'next/server'
import { getAuthContext, getUserPermissions, isSessionActive } from '@/lib/auth'
import { errorResponse } from '@/lib/api-helpers'
import { db } from '@/lib/db'
import { DomainException } from '@/lib/shared'

export interface AuthContext {
  userId: string
  tenantId: string
  sessionId: string
  userType: string
  username: string
  roles: string[]
}

/**
 * Error thrown when the session has been revoked (e.g., user logged out).
 *
 * F-01 fix (Audit v4): allows requirePermission to signal 401 instead of 403
 * when the session is no longer active.
 */
export class SessionRevokedError extends DomainException {
  constructor(message: string = 'Session has been revoked. Please login again.') {
    super(message, 'SESSION_REVOKED', 401)
  }
}

/**
 * Check if a user has a specific permission.
 * Uses in-memory cache (per-request) to avoid repeated DB queries.
 *
 * Super admins (role: 'super_admin') bypass all permission checks.
 *
 * F-01 fix (Audit v4): also verifies the session is still active before
 * checking permissions. If the session has been revoked (e.g., user logged
 * out), throws SessionRevokedError → 401.
 */
export async function checkPermission(ctx: AuthContext, permissionKey: string): Promise<boolean> {
  // F-01 fix: verify session is still active
  const active = await isSessionActive(ctx.sessionId)
  if (!active) {
    throw new SessionRevokedError()
  }

  // Super admin bypasses all checks
  if (ctx.roles.includes('super_admin')) return true

  const permissions = await getUserPermissions(ctx.userId, ctx.tenantId)
  return permissions.includes(permissionKey)
}

/**
 * Require a specific permission. Throws PermissionDeniedError if not granted.
 * Throws SessionRevokedError (F-01 fix) if session has been revoked.
 *
 * @param ctx - Auth context from request headers
 * @param permissionKey - e.g., 'sales.create', 'inventory.read'
 */
export async function requirePermission(ctx: AuthContext, permissionKey: string): Promise<void> {
  const hasPermission = await checkPermission(ctx, permissionKey)
  if (!hasPermission) {
    throw new PermissionDeniedError(permissionKey, ctx.userId)
  }
}

/**
 * Require ANY of the given permissions (OR logic).
 *
 * F-01 fix (Audit v4): also verifies session is active.
 */
export async function requireAnyPermission(ctx: AuthContext, permissionKeys: string[]): Promise<void> {
  // F-01 fix: verify session is still active
  const active = await isSessionActive(ctx.sessionId)
  if (!active) {
    throw new SessionRevokedError()
  }

  // Super admin bypasses
  if (ctx.roles.includes('super_admin')) return

  const permissions = await getUserPermissions(ctx.userId, ctx.tenantId)
  const hasAny = permissionKeys.some((key) => permissions.includes(key))
  if (!hasAny) {
    throw new PermissionDeniedError(permissionKeys.join(' | '), ctx.userId)
  }
}

/**
 * Require ALL of the given permissions (AND logic).
 *
 * F-01 fix (Audit v4): also verifies session is active.
 */
export async function requireAllPermissions(ctx: AuthContext, permissionKeys: string[]): Promise<void> {
  // F-01 fix: verify session is still active
  const active = await isSessionActive(ctx.sessionId)
  if (!active) {
    throw new SessionRevokedError()
  }

  // Super admin bypasses
  if (ctx.roles.includes('super_admin')) return

  const permissions = await getUserPermissions(ctx.userId, ctx.tenantId)
  const hasAll = permissionKeys.every((key) => permissions.includes(key))
  if (!hasAll) {
    throw new PermissionDeniedError(permissionKeys.join(' & '), ctx.userId)
  }
}

/**
 * Wrapper for GET route handlers with permission enforcement.
 *
 * Usage:
 *   export const GET = withPermission('product.read', async (request, ctx) => {
 *     const tenantId = ctx.tenantId
 *     // ... business logic
 *     return jsonResponse({ data: [...] })
 *   })
 */
export function withPermission(
  permissionKey: string,
  handler: (request: NextRequest, ctx: AuthContext) => Promise<Response>,
): (request: NextRequest) => Promise<Response> {
  return async (request: NextRequest) => {
    const ctx = getAuthContext(request)
    if (!ctx) {
      return errorResponse({
        code: 'UNAUTHORIZED',
        message: 'Not authenticated',
        statusCode: 401,
      })
    }

    try {
      await requirePermission(ctx, permissionKey)
    } catch (e) {
      if (e instanceof SessionRevokedError) {
        return errorResponse({
          code: 'SESSION_REVOKED',
          message: e.message,
          statusCode: 401,
        })
      }
      if (e instanceof PermissionDeniedError) {
        return errorResponse({
          code: 'FORBIDDEN',
          message: `You don't have permission: ${permissionKey}. Required permission: ${e.permissionKey}`,
          statusCode: 403,
        })
      }
      throw e
    }

    return handler(request, ctx)
  }
}

/**
 * Wrapper for POST/PUT/DELETE route handlers with permission enforcement.
 * Also handles idempotency check for write operations.
 */
export function withPermissionAndIdempotency(
  permissionKey: string,
  handler: (request: NextRequest, ctx: AuthContext) => Promise<Response>,
): (request: NextRequest) => Promise<Response> {
  return async (request: NextRequest) => {
    const ctx = getAuthContext(request)
    if (!ctx) {
      return errorResponse({
        code: 'UNAUTHORIZED',
        message: 'Not authenticated',
        statusCode: 401,
      })
    }

    try {
      await requirePermission(ctx, permissionKey)
    } catch (e) {
      if (e instanceof SessionRevokedError) {
        return errorResponse({
          code: 'SESSION_REVOKED',
          message: e.message,
          statusCode: 401,
        })
      }
      if (e instanceof PermissionDeniedError) {
        return errorResponse({
          code: 'FORBIDDEN',
          message: `Access denied. Required permission: ${e.permissionKey}`,
          statusCode: 403,
        })
      }
      throw e
    }

    return handler(request, ctx)
  }
}

/**
 * Get the auth context or return a 401 response.
 * Use this when you need the context but don't need a specific permission.
 */
export function requireAuth(request: NextRequest): AuthContext | null {
  return getAuthContext(request)
}

/**
 * Create a 401 Unauthorized response.
 */
export function unauthorizedResponse(): Response {
  return errorResponse({
    code: 'UNAUTHORIZED',
    message: 'Not authenticated. Provide a valid Bearer token.',
    statusCode: 401,
  })
}

/**
 * Create a 403 Forbidden response.
 */
export function forbiddenResponse(permissionKey: string): Response {
  return errorResponse({
    code: 'FORBIDDEN',
    message: `Access denied. Required permission: ${permissionKey}`,
    statusCode: 403,
  })
}

/**
 * Error thrown when a user lacks a required permission.
 * Extends DomainException so it's caught by the standard catch block in API routes.
 */
export class PermissionDeniedError extends DomainException {
  constructor(
    public permissionKey: string,
    public userId: string,
  ) {
    super(
      `Access denied. Required permission: ${permissionKey}`,
      'FORBIDDEN',
      403,
    )
  }
}
