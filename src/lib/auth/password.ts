/**
 * BISMARK ERP — Password Hashing Utility
 *
 * Uses Node.js built-in crypto.scryptSync (no external dependency).
 * Format: scrypt:<salt_hex>:<hash_hex>
 *
 * Security:
 * - scrypt with N=16384, r=8, p=1 (OWASP recommended minimum)
 * - 32-byte salt (cryptographically random)
 * - 64-byte key length
 */

import crypto from 'crypto'

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 }
const SALT_LENGTH = 32 // bytes
const KEY_LENGTH = 64 // bytes
const MAX_PASSWORD_LENGTH = 256

/**
 * Hash a password using scrypt.
 * Returns: "scrypt:<salt_hex>:<hash_hex>"
 */
export function hashPassword(password: string): string {
  if (!password || password.length === 0) {
    throw new Error('Password cannot be empty')
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new Error(`Password exceeds maximum length of ${MAX_PASSWORD_LENGTH}`)
  }

  const salt = crypto.randomBytes(SALT_LENGTH)
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH, SCRYPT_PARAMS)

  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`
}

/**
 * Verify a password against a stored hash.
 * Supports format: "scrypt:<salt_hex>:<hash_hex>"
 *
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash) return false

  const parts = storedHash.split(':')
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    // Unknown format — reject
    return false
  }

  const salt = Buffer.from(parts[1], 'hex')
  const expectedHash = Buffer.from(parts[2], 'hex')

  if (salt.length !== SALT_LENGTH || expectedHash.length !== KEY_LENGTH) {
    return false
  }

  const actualHash = crypto.scryptSync(password, salt, KEY_LENGTH, SCRYPT_PARAMS)

  // Timing-safe comparison
  return crypto.timingSafeEqual(expectedHash, actualHash)
}

/**
 * Check if a password meets minimum complexity requirements.
 * Returns array of issues (empty = valid).
 */
export function validatePasswordPolicy(password: string): string[] {
  const issues: string[] = []

  if (!password || password.length < 8) {
    issues.push('Password must be at least 8 characters long')
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    issues.push(`Password must not exceed ${MAX_PASSWORD_LENGTH} characters`)
  }
  if (!/[a-z]/.test(password)) {
    issues.push('Password must contain at least one lowercase letter')
  }
  if (!/[A-Z]/.test(password)) {
    issues.push('Password must contain at least one uppercase letter')
  }
  if (!/[0-9]/.test(password)) {
    issues.push('Password must contain at least one digit')
  }

  return issues
}
