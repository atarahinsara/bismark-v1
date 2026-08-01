/**
 * BISMARK ERP — PII Encryption Service (T-2-18)
 *
 * Field-level AES-256-GCM encryption for PII data.
 * Used for: Party.taxId, Party.metadata.email/phone, User.email, User.phone
 *
 * Encryption flow:
 *   plaintext → AES-256-GCM(key, iv) → base64(iv + ciphertext + authTag)
 *
 * Decryption flow:
 *   base64 → iv + ciphertext + authTag → AES-256-GCM decrypt → plaintext
 *
 * Key management:
 *   - Sandbox: PII_ENCRYPTION_KEY env var (or derived default for dev)
 *   - Production: HashiCorp Vault or AWS KMS (T-2-16)
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // GCM standard
const AUTH_TAG_LENGTH = 16

function getEncryptionKey(): Buffer {
  const keyHex = process.env.PII_ENCRYPTION_KEY
  if (keyHex) {
    if (keyHex.length !== 64) {
      throw new Error('PII_ENCRYPTION_KEY must be 64 hex chars (32 bytes / 256 bits)')
    }
    return Buffer.from(keyHex, 'hex')
  }

  // Sandbox fallback — derive a stable key from JWT secret
  // DO NOT use in production
  const jwtSecret = process.env.JWT_SECRET || 'bismark-dev-secret-change-in-production-01910000'
  return createHash('sha256').update(jwtSecret + ':pii-key').digest()
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns base64(iv + ciphertext + authTag).
 */
export function encryptPII(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  // Format: iv(12) + authTag(16) + ciphertext
  const combined = Buffer.concat([iv, authTag, encrypted])
  return combined.toString('base64')
}

/**
 * Decrypt an encrypted string.
 * Returns the original plaintext.
 * Throws if authTag verification fails (tampered data).
 */
export function decryptPII(encryptedBase64: string): string {
  const key = getEncryptionKey()
  const combined = Buffer.from(encryptedBase64, 'base64')

  if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Invalid encrypted data format')
  }

  const iv = combined.subarray(0, IV_LENGTH)
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}

/**
 * Check if a value appears to be encrypted (base64 with correct length).
 * Used to avoid double-encryption.
 */
export function isEncrypted(value: string): boolean {
  try {
    const buf = Buffer.from(value, 'base64')
    return buf.length >= IV_LENGTH + AUTH_TAG_LENGTH
  } catch {
    return false
  }
}

/**
 * Encrypt a PII field only if not already encrypted.
 * Safe to call on already-encrypted data.
 */
export function encryptPIISafe(plaintext: string | null | undefined): string | null {
  if (!plaintext) return null
  if (isEncrypted(plaintext)) return plaintext // already encrypted
  return encryptPII(plaintext)
}

/**
 * Decrypt a PII field with error handling.
 * Returns null if decryption fails (corrupted data).
 */
export function decryptPIISafe(encrypted: string | null | undefined): string | null {
  if (!encrypted) return null
  try {
    return decryptPII(encrypted)
  } catch {
    return null
  }
}
