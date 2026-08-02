/**
 * BISMARK ERP — Auth Extensions
 *
 * Provides:
 *   - register(userData) → { userId, verificationToken }
 *   - verifyEmail(token) → { success }
 *   - requestPasswordReset(email) → { token } (token returned only in dev mode)
 *   - resetPassword(token, newPassword) → { success }
 *   - changePassword(userId, oldPassword, newPassword) → { success }
 *   - getUserSessions(userId) → Session[]
 *   - revokeSession(sessionId, userId) → { success }
 *   - revokeAllSessions(userId, exceptSessionId?) → { count }
 */

import { db } from '@/lib/db'
import { hashPassword, verifyPassword } from './password'
import { hashToken } from './jwt'
import crypto from 'crypto'

const EMAIL_VERIFICATION_EXPIRY_HOURS = 24
const PASSWORD_RESET_EXPIRY_HOURS = 1

export class AuthExtensionError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
  ) {
    super(message)
  }
}

/**
 * Register a new user.
 */
export async function register(input: {
  username: string
  email: string
  password: string
  displayName?: string
  tenantId: string
  ipAddress?: string
}): Promise<{ userId: string; verificationToken: string }> {
  const { username, email, password, tenantId } = input

  // Validate password strength
  if (password.length < 8) {
    throw new AuthExtensionError('WEAK_PASSWORD', 'Password must be at least 8 characters', 422)
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    throw new AuthExtensionError(
      'WEAK_PASSWORD',
      'Password must contain uppercase, lowercase, and a number',
      422,
    )
  }

  // Check username uniqueness
  const existingUsername = await db.user.findFirst({
    where: { tenantId, username, deletedAt: null },
  })
  if (existingUsername) {
    throw new AuthExtensionError('USERNAME_TAKEN', 'Username is already taken', 409)
  }

  // Check email uniqueness
  const existingEmail = await db.user.findFirst({
    where: { tenantId, email, deletedAt: null },
  })
  if (existingEmail) {
    throw new AuthExtensionError('EMAIL_TAKEN', 'Email is already registered', 409)
  }

  const passwordHash = hashPassword(password)

  const user = await db.user.create({
    data: {
      tenantId,
      username,
      email,
      displayName: input.displayName || username,
      passwordHash,
      userType: 'staff',
      status: 'pending',
      isActive: false, // inactive until email verified
      locale: 'fa-IR',
      metadata: { registeredFrom: input.ipAddress || 'unknown' },
    },
  })

  // Generate email verification token
  const verificationToken = crypto.randomBytes(32).toString('hex')
  const tokenHash = hashToken(verificationToken)

  await db.emailVerificationToken.create({
    data: {
      userId: user.id,
      tenantId,
      token: verificationToken,
      tokenHash,
      expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000),
    },
  })

  return { userId: user.id, verificationToken }
}

/**
 * Verify email with token.
 */
export async function verifyEmail(token: string): Promise<{ userId: string; email: string }> {
  const tokenHash = hashToken(token)

  const record = await db.emailVerificationToken.findFirst({
    where: { tokenHash, usedAt: null },
    include: { user: true },
  })

  if (!record) {
    throw new AuthExtensionError('INVALID_TOKEN', 'Invalid or already used verification token', 400)
  }

  if (record.expiresAt < new Date()) {
    throw new AuthExtensionError('TOKEN_EXPIRED', 'Verification token has expired', 410)
  }

  await db.$transaction([
    db.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    db.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date(), isActive: true, status: 'active' },
    }),
  ])

  return { userId: record.userId, email: record.user.email || '' }
}

/**
 * Request password reset.
 */
export async function requestPasswordReset(
  email: string,
  tenantId: string,
  ipAddress?: string,
): Promise<{ token: string | null; userId: string | null }> {
  const user = await db.user.findFirst({
    where: { tenantId, email, deletedAt: null },
  })

  if (!user) {
    return { token: null, userId: null }
  }

  // Invalidate existing tokens
  await db.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  })

  const token = crypto.randomBytes(32).toString('hex')
  const tokenHash = hashToken(token)

  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      tenantId,
      token,
      tokenHash,
      expiresAt: new Date(Date.now() + PASSWORD_RESET_EXPIRY_HOURS * 60 * 60 * 1000),
      ipAddress,
    },
  })

  return { token, userId: user.id }
}

/**
 * Reset password with token.
 */
export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<{ userId: string }> {
  if (newPassword.length < 8) {
    throw new AuthExtensionError('WEAK_PASSWORD', 'Password must be at least 8 characters', 422)
  }

  const tokenHash = hashToken(token)
  const record = await db.passwordResetToken.findFirst({
    where: { tokenHash, usedAt: null },
  })

  if (!record) {
    throw new AuthExtensionError('INVALID_TOKEN', 'Invalid or already used reset token', 400)
  }

  if (record.expiresAt < new Date()) {
    throw new AuthExtensionError('TOKEN_EXPIRED', 'Reset token has expired', 410)
  }

  // Protect super_admin accounts from being reset via token
  const userRoles = await db.userRole.findFirst({
    where: { userId: record.userId },
    include: { role: true },
  })
  if (userRoles?.role?.key === 'super_admin') {
    throw new AuthExtensionError(
      'PROTECTED_ACCOUNT',
      'این حساب محافظت می‌شود و قابل بازیابی نیست.',
      403,
    )
  }

  const passwordHash = hashPassword(newPassword)

  await db.$transaction([
    db.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    db.user.update({
      where: { id: record.userId },
      data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
    }),
    db.session.updateMany({
      where: { userId: record.userId, status: 'active' },
      data: { status: 'revoked', revokedAt: new Date(), revokedReason: 'password_reset' },
    }),
  ])

  return { userId: record.userId }
}

/**
 * Change password for authenticated user.
 */
export async function changePassword(
  userId: string,
  oldPassword: string,
  newPassword: string,
  keepCurrentSession?: string,
): Promise<void> {
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user || !user.passwordHash) {
    throw new AuthExtensionError('USER_NOT_FOUND', 'User not found', 404)
  }

  if (!verifyPassword(oldPassword, user.passwordHash)) {
    throw new AuthExtensionError('WRONG_PASSWORD', 'Current password is incorrect', 401)
  }

  if (newPassword.length < 8) {
    throw new AuthExtensionError('WEAK_PASSWORD', 'Password must be at least 8 characters', 422)
  }

  const passwordHash = hashPassword(newPassword)

  await db.user.update({
    where: { id: userId },
    data: { passwordHash },
  })

  const where = keepCurrentSession
    ? { userId, status: 'active' as const, NOT: { id: keepCurrentSession } }
    : { userId, status: 'active' as const }

  await db.session.updateMany({
    where,
    data: { status: 'revoked', revokedAt: new Date(), revokedReason: 'password_changed' },
  })
}

/**
 * Resend email verification.
 * - Invalidates existing tokens
 * - Creates a new token
 * - Rate-limited: max 3 resends per hour
 */
export async function resendVerificationEmail(
  email: string,
  tenantId: string,
): Promise<{ token: string | null; userId: string | null; rateLimited?: boolean }> {
  const user = await db.user.findFirst({
    where: { tenantId, email, deletedAt: null },
  })

  if (!user) {
    return { token: null, userId: null }
  }

  // Already verified
  if (user.emailVerifiedAt) {
    return { token: null, userId: user.id }
  }

  // Rate limit: check how many tokens were created in the last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const recentTokens = await db.emailVerificationToken.count({
    where: { userId: user.id, createdAt: { gt: oneHourAgo } },
  })

  if (recentTokens >= 3) {
    return { token: null, userId: user.id, rateLimited: true }
  }

  // Invalidate existing tokens
  await db.emailVerificationToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  })

  // Create new token
  const token = crypto.randomBytes(32).toString('hex')
  const tokenHash = hashToken(token)

  await db.emailVerificationToken.create({
    data: {
      userId: user.id,
      tenantId,
      token,
      tokenHash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  })

  return { token, userId: user.id }
}


/**
 * Get all active sessions for a user.
 */
export async function getUserSessions(userId: string) {
  const sessions = await db.session.findMany({
    where: { userId, status: 'active' },
    orderBy: { lastActivityAt: 'desc' },
    select: {
      id: true,
      ipAddress: true,
      userAgent: true,
      deviceFingerprint: true,
      issuedAt: true,
      lastActivityAt: true,
      expiresAt: true,
    },
  })

  return sessions.map((s) => ({
    ...s,
    browser: parseBrowser(s.userAgent),
    os: parseOS(s.userAgent),
    device: parseDevice(s.userAgent),
  }))
}

/**
 * Revoke a specific session.
 */
export async function revokeSession(sessionId: string, userId: string): Promise<void> {
  const session = await db.session.findFirst({
    where: { id: sessionId, userId },
  })

  if (!session) {
    throw new AuthExtensionError('SESSION_NOT_FOUND', 'Session not found', 404)
  }

  await db.session.update({
    where: { id: sessionId },
    data: { status: 'revoked', revokedAt: new Date(), revokedReason: 'user_revoke' },
  })
}

/**
 * Revoke all sessions except the specified one.
 */
export async function revokeAllSessions(userId: string, exceptSessionId?: string): Promise<number> {
  const where = exceptSessionId
    ? { userId, status: 'active' as const, NOT: { id: exceptSessionId } }
    : { userId, status: 'active' as const }

  const result = await db.session.updateMany({
    where,
    data: { status: 'revoked', revokedAt: new Date(), revokedReason: 'revoke_all' },
  })

  return result.count
}

// ============================================================
// User Agent parsing helpers
// ============================================================

function parseBrowser(ua?: string | null): string {
  if (!ua) return 'Unknown'
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Edg')) return 'Edge'
  if (ua.includes('Chrome')) return 'Chrome'
  if (ua.includes('Safari')) return 'Safari'
  if (ua.includes('Opera')) return 'Opera'
  return 'Unknown'
}

function parseOS(ua?: string | null): string {
  if (!ua) return 'Unknown'
  if (ua.includes('Windows')) return 'Windows'
  if (ua.includes('Mac OS')) return 'macOS'
  if (ua.includes('Linux')) return 'Linux'
  if (ua.includes('Android')) return 'Android'
  if (ua.includes('iOS') || ua.includes('iPhone')) return 'iOS'
  return 'Unknown'
}

function parseDevice(ua?: string | null): string {
  if (!ua) return 'Unknown'
  if (ua.includes('Mobile')) return 'Mobile'
  if (ua.includes('Tablet') || ua.includes('iPad')) return 'Tablet'
  return 'Desktop'
}
