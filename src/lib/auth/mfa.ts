/**
 * BISMARK ERP — MFA Service (T-2-17)
 *
 * TOTP (Time-based One-Time Password) implementation per RFC 6238.
 * Uses otplib v13 functional API with default plugins.
 *
 * Flow:
 *   1. User calls POST /auth/mfa/setup → returns secret + QR code URI
 *   2. User adds to authenticator app (Google Authenticator, Authy, etc.)
 *   3. User enters 6-digit code → POST /auth/mfa/verify
 *   4. If valid: mfaEnabled=true, mfaSecret stored
 *   5. On subsequent logins: if mfaEnabled, must provide TOTP code
 */

import {
  generateSecret,
  generateURI,
  generateSync,
  verifySync,
} from 'otplib'

/**
 * Generate a new TOTP secret for a user.
 * Returns the base32-encoded secret.
 */
export function generateMfaSecret(): string {
  return generateSecret({ length: 20 })
}

/**
 * Generate the otpauth:// URI for QR code scanning.
 * Format: otpauth://totp/BISMARK:user@email?secret=XXX&issuer=BISMARK
 */
export function generateOtpAuthUri(email: string, secret: string): string {
  return generateURI({
    issuer: 'BISMARK',
    label: email,
    secret,
    algorithm: 'sha1',
    digits: 6,
    period: 30,
  })
}

/**
 * Verify a TOTP code against a secret.
 * Returns true if valid (within ±30s window).
 *
 * Uses sync verify with epochTolerance of 30s (±1 step).
 */
export function verifyMfaToken(secret: string, token: string): boolean {
  try {
    const result = verifySync({
      secret,
      token,
      epochTolerance: 30, // allow ±1 step (30s before/after)
    })
    return result.valid
  } catch {
    return false
  }
}

/**
 * Generate a current TOTP code (for testing/debugging).
 */
export function generateCurrentToken(secret: string): string {
  return generateSync({ secret, period: 30, digits: 6 })
}

/**
 * Generate backup codes (10 codes, 8 chars each).
 * User can use these if they lose their authenticator device.
 * Store hashed (SHA-256) in DB.
 */
export function generateBackupCodes(): string[] {
  const codes: string[] = []
  for (let i = 0; i < 10; i++) {
    const bytes = new Uint8Array(4)
    crypto.getRandomValues(bytes)
    const code = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
      .slice(0, 8)
    codes.push(code)
  }
  return codes
}

/**
 * Hash a backup code for storage (SHA-256).
 * Plain code is shown to user once at setup time.
 */
export async function hashBackupCode(code: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(code)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Verify a backup code against a list of hashed codes.
 * Returns the index of the matched code (to remove it), or -1 if no match.
 */
export async function verifyBackupCode(
  code: string,
  hashedCodes: string[],
): Promise<number> {
  const hash = await hashBackupCode(code)
  return hashedCodes.indexOf(hash)
}
