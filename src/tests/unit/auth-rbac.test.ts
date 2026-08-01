/**
 * BISMARK ERP — Auth & RBAC Tests
 *
 * Phase 8: Testing — Authentication and authorization tests
 */

import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword, validatePasswordPolicy } from '@/lib/auth/password'
import {
  createAccessToken,
  createRefreshToken,
  verifyToken,
  hashToken,
  extractBearerToken,
  ACCESS_TOKEN_EXPIRY_SECONDS,
} from '@/lib/auth/jwt'
import { TenantGuardError } from '@/lib/db-guarded'
import { PermissionDeniedError } from '@/lib/rbac'

// ============================================================
// Password Hashing
// ============================================================
describe('Password Hashing', () => {
  it('hashes a password and verifies it', () => {
    const hash = hashPassword('Test1234')
    expect(hash).toMatch(/^scrypt:/)
    expect(verifyPassword('Test1234', hash)).toBe(true)
  })

  it('rejects wrong password', () => {
    const hash = hashPassword('Test1234')
    expect(verifyPassword('WrongPass', hash)).toBe(false)
  })

  it('rejects empty password', () => {
    expect(() => hashPassword('')).toThrow('Password cannot be empty')
  })

  it('rejects too long password', () => {
    const long = 'a'.repeat(300)
    expect(() => hashPassword(long)).toThrow('maximum length')
  })

  it('produces different hashes for same password (salt)', () => {
    const h1 = hashPassword('Test1234')
    const h2 = hashPassword('Test1234')
    expect(h1).not.toBe(h2)
  })

  it('rejects invalid hash format', () => {
    expect(verifyPassword('test', 'invalid-hash')).toBe(false)
    expect(verifyPassword('test', 'bcrypt:abc:def')).toBe(false)
  })
})

describe('Password Policy', () => {
  it('accepts strong password', () => {
    expect(validatePasswordPolicy('Abc12345')).toEqual([])
  })

  it('rejects short password', () => {
    expect(validatePasswordPolicy('Ab1')).toContain('Password must be at least 8 characters long')
  })

  it('rejects without uppercase', () => {
    expect(validatePasswordPolicy('abc12345')).toContain('Password must contain at least one uppercase letter')
  })

  it('rejects without lowercase', () => {
    expect(validatePasswordPolicy('ABC12345')).toContain('Password must contain at least one lowercase letter')
  })

  it('rejects without digit', () => {
    expect(validatePasswordPolicy('Abcdefgh')).toContain('Password must contain at least one digit')
  })
})

// ============================================================
// JWT
// ============================================================
describe('JWT', () => {
  it('creates and verifies an access token', () => {
    const { token, payload } = createAccessToken({
      sub: 'user-1',
      tenantId: 'tenant-1',
      sessionId: 'session-1',
      userType: 'staff',
      username: 'admin',
      displayName: 'Admin',
      roles: ['super_admin'],
    })

    expect(token.split('.').length).toBe(3)
    expect(payload.sub).toBe('user-1')
    expect(payload.exp).toBeGreaterThan(payload.iat)

    const verified = verifyToken(token)
    expect(verified.sub).toBe('user-1')
    expect(verified.roles).toEqual(['super_admin'])
  })

  it('creates and verifies a refresh token', () => {
    const { token, payload } = createRefreshToken('user-1', 'session-1')
    expect(token.split('.').length).toBe(3)

    const verified = verifyToken(token)
    expect(verified.sub).toBe('user-1')
    expect(verified.sessionId).toBe('session-1')
  })

  it('rejects tampered token', () => {
    const { token } = createAccessToken({
      sub: 'user-1', tenantId: 't1', sessionId: 's1',
      userType: 'staff', username: 'admin', displayName: 'A', roles: [],
    })
    const tampered = token.slice(0, -5) + 'XXXXX'
    expect(() => verifyToken(tampered)).toThrow()
  })

  it('rejects malformed token', () => {
    expect(() => verifyToken('not.a.jwt')).toThrow()
    expect(() => verifyToken('')).toThrow()
  })

  it('extracts Bearer token from header', () => {
    expect(extractBearerToken('Bearer abc123')).toBe('abc123')
    expect(extractBearerToken('bearer abc123')).toBe('abc123')
    expect(extractBearerToken('Basic abc123')).toBeNull()
    expect(extractBearerToken(null)).toBeNull()
  })

  it('hashes token deterministically', () => {
    const token = 'test-token-123'
    const h1 = hashToken(token)
    const h2 = hashToken(token)
    expect(h1).toBe(h2)
    expect(h1).toHaveLength(64) // SHA-256 hex
  })

  it('access token expires in 15 minutes', () => {
    expect(ACCESS_TOKEN_EXPIRY_SECONDS).toBe(900)
  })
})

// ============================================================
// RBAC
// ============================================================
describe('RBAC', () => {
  it('PermissionDeniedError has correct properties', () => {
    const err = new PermissionDeniedError('sales.create', 'user-1')
    expect(err.permissionKey).toBe('sales.create')
    expect(err.userId).toBe('user-1')
    expect(err.code).toBe('FORBIDDEN')
    expect(err.statusCode).toBe(403)
    expect(err.message).toContain('sales.create')
  })

  it('TenantGuardError has correct message', () => {
    const err = new TenantGuardError('Missing tenantId')
    expect(err.message).toContain('Missing tenantId')
    expect(err.name).toBe('TenantGuardError')
  })
})

// ============================================================
// Rate Limiter
// ============================================================
describe('Rate Limiter', () => {
  it('allows requests under limit', async () => {
    const { rateLimit } = await import('@/lib/rate-limiter')
    const result = rateLimit('test:allow', 'ip-1', { maxRequests: 5, windowSeconds: 60 })
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4)
  })

  it('blocks requests over limit', async () => {
    const { rateLimit } = await import('@/lib/rate-limiter')
    const key = 'test:block:' + Date.now()
    for (let i = 0; i < 5; i++) {
      rateLimit(key, 'ip-2', { maxRequests: 5, windowSeconds: 60 })
    }
    const result = rateLimit(key, 'ip-2', { maxRequests: 5, windowSeconds: 60 })
    expect(result.allowed).toBe(false)
    expect(result.retryAfterSeconds).toBeGreaterThan(0)
  })
})
