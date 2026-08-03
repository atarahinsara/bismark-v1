/**
 * BISMARK ERP — Authentication Service
 *
 * Provides:
 *   - login(username, password) → { accessToken, refreshToken, user }
 *   - logout(token) → void
 *   - refresh(refreshToken) → { accessToken, refreshToken }
 *   - getAuthContext(request) → AuthContext | null
 *   - getUserPermissions(userId, tenantId) → string[]
 *
 * Uses:
 *   - password.ts for scrypt password hashing
 *   - jwt.ts for JWT creation and verification
 *   - db for User, Session, Role, Permission queries
 *
 * Security:
 *   - Account lockout after 5 failed attempts (15 min lock)
 *   - Session recorded in DB with token hash (for revocation)
 *   - Refresh token rotation (old token invalidated on refresh)
 *   - Absolute session timeout (8 hours)
 */

import { db } from '@/lib/db'
import { hashPassword, verifyPassword } from './password'
import {
  createAccessToken,
  createRefreshToken,
  verifyToken,
  hashToken,
  extractBearerToken,
  ACCESS_TOKEN_EXPIRY_SECONDS,
  REFRESH_TOKEN_EXPIRY_SECONDS,
  SESSION_ABSOLUTE_EXPIRY_SECONDS,
  type JwtPayload,
} from './jwt'
import type { NextRequest } from 'next/server'

const MAX_FAILED_ATTEMPTS = 5
const LOCK_DURATION_MS = 15 * 60 * 1000 // 15 minutes

export interface AuthResult {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: {
    id: string
    username: string
    displayName: string
    email: string | null
    userType: string
    tenantId: string
    roles: string[]
  }
}

export interface AuthContext {
  userId: string
  tenantId: string
  sessionId: string
  userType: string
  username: string
  roles: string[]
}

/**
 * Login a user with username and password.
 * Creates a session in the database and returns JWT tokens.
 *
 * T-2-17: If user has MFA enabled, mfaToken must be provided.
 * If MFA enabled but no token, throws AuthError MFA_REQUIRED.
 */
export async function login(
  username: string,
  password: string,
  ipAddress: string,
  userAgent?: string,
  mfaToken?: string,
): Promise<AuthResult> {
  // Find user by username OR email (cross-tenant lookup for sandbox)
  const user = await db.user.findFirst({
    where: {
      OR: [
        { username, deletedAt: null },
        { email: username, deletedAt: null },
      ],
    },
    include: {
      tenant: true,
      userRoles: {
        include: { role: true },
      },
    },
  })

  if (!user) {
    throw new AuthError('INVALID_CREDENTIALS', 'Invalid username or password', 401)
  }

  // Check account status
  if (user.status === 'locked' || (user.lockedUntil && user.lockedUntil > new Date())) {
    throw new AuthError(
      'ACCOUNT_LOCKED',
      `Account is locked until ${user.lockedUntil?.toISOString()}. Try again later.`,
      423,
    )
  }

  // Check email verification — block login if email not verified
  // Super admins bypass this check (they are pre-verified system accounts)
  const isSuperAdmin = user.userRoles?.some(ur => ur.role?.key === 'super_admin')
  if (!user.emailVerifiedAt && !isSuperAdmin) {
    throw new AuthError(
      'EMAIL_NOT_VERIFIED',
      'لطفاً ابتدا ایمیل خود را تأیید کنید.',
      403,
    )
  }

  if (user.status === 'suspended' || user.status === 'deleted' || !user.isActive) {
    throw new AuthError('ACCOUNT_DISABLED', 'Account is disabled. Contact administrator.', 403)
  }

  // Verify password
  if (!user.passwordHash) {
    throw new AuthError(
      'PASSWORD_NOT_SET',
      'Password not set for this account. Contact administrator.',
      401,
    )
  }

  const isPasswordValid = verifyPassword(password, user.passwordHash)
  if (!isPasswordValid) {
    // Increment failed attempts
    const newAttempts = user.failedLoginAttempts + 1
    const shouldLock = newAttempts >= MAX_FAILED_ATTEMPTS

    await db.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: newAttempts,
        lockedUntil: shouldLock ? new Date(Date.now() + LOCK_DURATION_MS) : user.lockedUntil,
        status: shouldLock ? 'locked' : user.status,
      },
    })

    if (shouldLock) {
      throw new AuthError(
        'ACCOUNT_LOCKED',
        `Too many failed attempts. Account locked for 15 minutes.`,
        423,
      )
    }

    throw new AuthError(
      'INVALID_CREDENTIALS',
      `Invalid username or password. ${MAX_FAILED_ATTEMPTS - newAttempts} attempts remaining.`,
      401,
    )
  }

  // Login successful — reset failed attempts
  await db.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    },
  })

  // T-2-17: MFA verification
  if (user.mfaEnabled) {
    if (!mfaToken) {
      throw new AuthError(
        'MFA_REQUIRED',
        'Multi-factor authentication is enabled for this account. Provide mfaToken in request body.',
        403,
      )
    }

    // Verify TOTP token
    const { verifyMfaToken } = await import('./mfa')
    const isMfaValid = user.mfaSecret ? verifyMfaToken(user.mfaSecret, mfaToken) : false

    if (!isMfaValid) {
      // Try backup codes
      const { verifyBackupCode } = await import('./mfa')
      const backupCodes = (user.mfaBackupCodes as string[] | null) || []
      const backupIdx = await verifyBackupCode(mfaToken, backupCodes)

      if (backupIdx === -1) {
        throw new AuthError(
          'MFA_TOKEN_INVALID',
          'Invalid MFA token or backup code.',
          401,
        )
      }

      // Remove used backup code
      const newBackupCodes = backupCodes.filter((_, i) => i !== backupIdx)
      await db.user.update({
        where: { id: user.id },
        data: { mfaBackupCodes: newBackupCodes, lastMfaAt: new Date() },
      })
    } else {
      await db.user.update({
        where: { id: user.id },
        data: { lastMfaAt: new Date() },
      })
    }
  }

  // Extract role keys
  const roleKeys = user.userRoles.map((ur) => ur.role.key)

  // Create access token
  const { token: accessToken, payload: accessPayload } = createAccessToken({
    sub: user.id,
    tenantId: user.tenantId,
    sessionId: '', // will be set after session creation
    userType: user.userType,
    username: user.username,
    displayName: user.displayName,
    roles: roleKeys,
  })

  // Create refresh token
  const { token: refreshToken } = createRefreshToken(user.id, '')

  // Create session in database
  const now = new Date()
  const session = await db.session.create({
    data: {
      userId: user.id,
      tenantId: user.tenantId,
      status: 'active',
      tokenHash: hashToken(accessToken),
      refreshTokenHash: hashToken(refreshToken),
      ipAddress,
      userAgent: userAgent || null,
      issuedAt: now,
      lastActivityAt: now,
      expiresAt: new Date(now.getTime() + ACCESS_TOKEN_EXPIRY_SECONDS * 1000),
      absoluteExpiresAt: new Date(now.getTime() + SESSION_ABSOLUTE_EXPIRY_SECONDS * 1000),
      metadata: { jti: accessPayload.jti },
    },
  })

  // Re-create access token with session ID
  const { token: finalAccessToken } = createAccessToken({
    sub: user.id,
    tenantId: user.tenantId,
    sessionId: session.id,
    userType: user.userType,
    username: user.username,
    displayName: user.displayName,
    roles: roleKeys,
  })

  // Update session with correct token hash
  await db.session.update({
    where: { id: session.id },
    data: { tokenHash: hashToken(finalAccessToken) },
  })

  return {
    accessToken: finalAccessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      userType: user.userType,
      tenantId: user.tenantId,
      roles: roleKeys,
    },
  }
}

/**
 * Logout — revoke the session associated with the given access token.
 *
 * F-01 fix (Audit v4): also invalidates the in-memory session cache so the
 * revocation takes effect immediately (without waiting for the 30s TTL).
 */
export async function logout(accessToken: string): Promise<void> {
  try {
    const payload = verifyToken<JwtPayload>(accessToken)
    await db.session.updateMany({
      where: {
        id: payload.sessionId,
        userId: payload.sub,
        status: 'active',
      },
      data: {
        status: 'revoked',
        revokedAt: new Date(),
        revokedReason: 'User logged out',
      },
    })
    // F-01 fix: invalidate cache so token is rejected on next request
    invalidateSessionCache(payload.sessionId)
  } catch {
    // Token is already invalid — nothing to revoke
  }
}

/**
 * Refresh — exchange a refresh token for a new access token + refresh token.
 * Implements refresh token rotation (old refresh token is invalidated).
 */
export async function refresh(refreshToken: string): Promise<{
  accessToken: string
  refreshToken: string
  expiresIn: number
}> {
  // Verify refresh token
  let payload: { sub: string; sessionId: string; exp: number; jti: string }
  try {
    payload = verifyToken(refreshToken)
  } catch {
    throw new AuthError('REFRESH_TOKEN_INVALID', 'Invalid refresh token', 401)
  }

  // Find session by refresh token hash
  const session = await db.session.findFirst({
    where: {
      refreshTokenHash: hashToken(refreshToken),
      status: 'active',
    },
  })

  if (!session) {
    throw new AuthError('SESSION_NOT_FOUND', 'Session not found or already revoked', 401)
  }

  // Check absolute expiry
  if (session.absoluteExpiresAt < new Date()) {
    await db.session.update({
      where: { id: session.id },
      data: {
        status: 'expired',
        revokedAt: new Date(),
        revokedReason: 'Absolute timeout exceeded',
      },
    })
    throw new AuthError('SESSION_EXPIRED', 'Session expired (absolute timeout). Please login again.', 401)
  }

  // Get user for new token
  const user = await db.user.findFirst({
    where: { id: session.userId, deletedAt: null },
    include: {
      userRoles: { include: { role: true } },
    },
  })

  if (!user || user.status !== 'active' || !user.isActive) {
    throw new AuthError('ACCOUNT_DISABLED', 'Account is no longer active', 403)
  }

  const roleKeys = user.userRoles.map((ur) => ur.role.key)

  // Create new access token
  const { token: newAccessToken } = createAccessToken({
    sub: user.id,
    tenantId: user.tenantId,
    sessionId: session.id,
    userType: user.userType,
    username: user.username,
    displayName: user.displayName,
    roles: roleKeys,
  })

  // Create new refresh token (rotation)
  const { token: newRefreshToken } = createRefreshToken(user.id, session.id)

  // Update session with new token hashes (invalidate old tokens)
  const now = new Date()
  await db.session.update({
    where: { id: session.id },
    data: {
      tokenHash: hashToken(newAccessToken),
      refreshTokenHash: hashToken(newRefreshToken),
      lastActivityAt: now,
      expiresAt: new Date(now.getTime() + ACCESS_TOKEN_EXPIRY_SECONDS * 1000),
    },
  })

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
  }
}

/**
 * Get auth context from request headers (set by middleware).
 * Returns null if not authenticated (shouldn't happen if middleware is working).
 */
export function getAuthContext(request: NextRequest): AuthContext | null {
  const userId = request.headers.get('x-auth-user-id')
  const tenantId = request.headers.get('x-auth-tenant-id')
  const sessionId = request.headers.get('x-auth-session-id')
  const userType = request.headers.get('x-auth-user-type')
  const username = request.headers.get('x-auth-username')
  const rolesHeader = request.headers.get('x-auth-roles')

  if (!userId || !tenantId || !sessionId) {
    return null
  }

  return {
    userId,
    tenantId,
    sessionId,
    userType: userType || 'staff',
    username: username || '',
    roles: rolesHeader ? rolesHeader.split(',').filter(Boolean) : [],
  }
}

/**
 * Get all permission keys for a user (via roles → role_permissions).
 */
export async function getUserPermissions(userId: string, tenantId: string): Promise<string[]> {
  const userRoles = await db.userRole.findMany({
    where: { userId, tenantId },
    select: { roleId: true },
  })

  if (userRoles.length === 0) return []

  const rolePermissions = await db.rolePermission.findMany({
    where: {
      roleId: { in: userRoles.map((ur) => ur.roleId) },
      tenantId,
    },
    include: { permission: true },
  })

  return rolePermissions.map((rp) => rp.permission.key)
}

// ============================================================
// F-01 Fix (Audit v4): Session Revocation Check
// ============================================================
//
// Problem: Middleware only verifies JWT signature + expiration.
//          Logout updates Session.status='revoked' in DB but middleware
//          doesn't check this, so token remains valid for full TTL (15min).
//
// Fix: Add `isSessionActive(sessionId)` that queries the Session table.
//      Called by `requirePermission` (in rbac.ts) on every protected request.
//
// Performance: Uses a 30-second in-memory cache to avoid hitting DB on every
//              request. Trade-off: revoked token remains valid for up to 30s
//              after logout. Acceptable for sandbox; production should use Redis.
//
// Cache eviction: entries expire automatically after TTL; no unbounded growth
//                 because we only store entries for sessions seen recently.
//
// IMPORTANT: Cache is stored on globalThis to survive Turbopack hot-reloads
//            and to be shared across all module instances (Turbopack may
//            load the same module multiple times in dev mode).

interface SessionCacheEntry {
  active: boolean
  expiresAt: number // epoch ms
}

const SESSION_CACHE_TTL_MS = 30_000 // 30 seconds

interface GlobalWithSessionCache {
  __bismarkSessionCache?: Map<string, SessionCacheEntry>
  __bismarkSessionCacheLastCleanup?: number
}

function getSessionCache(): Map<string, SessionCacheEntry> {
  const g = globalThis as unknown as GlobalWithSessionCache
  if (!g.__bismarkSessionCache) {
    g.__bismarkSessionCache = new Map()
    g.__bismarkSessionCacheLastCleanup = Date.now()
  }
  return g.__bismarkSessionCache
}

function getLastCleanup(): number {
  const g = globalThis as unknown as GlobalWithSessionCache
  return g.__bismarkSessionCacheLastCleanup ?? Date.now()
}

function setLastCleanup(t: number): void {
  const g = globalThis as unknown as GlobalWithSessionCache
  g.__bismarkSessionCacheLastCleanup = t
}

// Periodic cleanup (every 5 minutes) to prevent unbounded growth
function cleanupSessionCache(): void {
  const now = Date.now()
  if (now - getLastCleanup() < 5 * 60 * 1000) return
  setLastCleanup(now)
  const cache = getSessionCache()
  for (const [key, entry] of cache) {
    if (entry.expiresAt < now) cache.delete(key)
  }
}

/**
 * Check if a session is still active (not revoked).
 * Uses a 30-second in-memory cache to reduce DB load.
 *
 * Returns true if the session is active, false if revoked or not found.
 */
export async function isSessionActive(sessionId: string): Promise<boolean> {
  cleanupSessionCache()
  const cache = getSessionCache()

  const cached = cache.get(sessionId)
  if (cached) {
    if (cached.expiresAt < Date.now()) {
      cache.delete(sessionId)
    } else {
      return cached.active
    }
  }

  const session = await db.session.findFirst({
    where: { id: sessionId },
    select: { status: true, expiresAt: true },
  })

  const now = new Date()
  const active = !!session && session.status === 'active' && session.expiresAt > now

  cache.set(sessionId, {
    active,
    expiresAt: Date.now() + SESSION_CACHE_TTL_MS,
  })

  return active
}

/**
 * Invalidate the cached session status. Called by logout() to ensure
 * immediate revocation (without waiting for TTL to expire).
 */
export function invalidateSessionCache(sessionId: string): void {
  const cache = getSessionCache()
  cache.delete(sessionId)
}

/**
 * Check if a user has a specific permission.
 */
export async function hasPermission(userId: string, tenantId: string, permissionKey: string): Promise<boolean> {
  const permissions = await getUserPermissions(userId, tenantId)
  return permissions.includes(permissionKey)
}

/**
 * Set a user's password (for seed or admin operations).
 */
export async function setUserPassword(userId: string, password: string): Promise<void> {
  const passwordHash = hashPassword(password)
  await db.user.update({
    where: { id: userId },
    data: { passwordHash },
  })
}

/**
 * Custom auth error class.
 */
export class AuthError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
  ) {
    super(message)
    this.name = 'AuthError'
  }
}
