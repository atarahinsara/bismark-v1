/**
 * BISMARK ERP — Input Sanitizer
 *
 * Phase 4: Security Hardening
 *
 * Provides utilities for sanitizing and validating user input to prevent:
 *   - SQL Injection (pattern detection)
 *   - XSS (HTML entity encoding)
 *   - Path Traversal (pattern detection)
 *   - NoSQL Injection (operator detection)
 *
 * Usage:
 *   import { sanitizeString, detectSqlInjection, detectXss } from '@/lib/input-sanitizer'
 *
 *   const clean = sanitizeString(userInput, { maxLength: 255 })
 *   const sqli = detectSqlInjection(searchQuery)
 *   if (sqli.detected) return errorResponse({ code: 'SUSPICIOUS_INPUT', ... })
 */

// ============================================================
// String Sanitization
// ============================================================

export interface SanitizeOptions {
  maxLength?: number
  trim?: boolean
  allowHtml?: boolean
}

/**
 * Sanitize a string input:
 * - Trim whitespace (default: true)
 * - Enforce max length (default: 10000)
 * - HTML-encode special characters (unless allowHtml=true)
 */
export function sanitizeString(input: string, options: SanitizeOptions = {}): string {
  const { maxLength = 10000, trim = true, allowHtml = false } = options

  if (typeof input !== 'string') return ''
  let result = input

  if (trim) result = result.trim()
  if (result.length > maxLength) result = result.substring(0, maxLength)

  if (!allowHtml) {
    result = result
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
  }

  return result
}

/**
 * Recursively sanitize all string values in an object.
 */
export function sanitizeObject<T>(obj: T, options?: SanitizeOptions): T {
  if (typeof obj === 'string') return sanitizeString(obj, options) as unknown as T
  if (Array.isArray(obj)) return obj.map((item) => sanitizeObject(item, options)) as unknown as T
  if (obj && typeof obj === 'object') {
    const result: any = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = sanitizeObject(value, options)
    }
    return result
  }
  return obj
}

// ============================================================
// SQL Injection Detection
// ============================================================

const SQL_INJECTION_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /'\s*OR\s*'?\d*'?\s*=\s*'?\d*'?/i, name: 'classic-or-1-equals-1' },
  { pattern: /'\s*OR\s*'[^']*'\s*=\s*'[^']*'/i, name: 'or-string-equality' },
  { pattern: /OR\s+1\s*=\s*1(?!\d)/i, name: 'or-1-equals-1-noquote' },
  { pattern: /UNION\s+SELECT/i, name: 'union-select' },
  { pattern: /;\s*DROP\s+TABLE/i, name: 'drop-table' },
  { pattern: /;\s*DELETE\s+FROM/i, name: 'delete-from' },
  { pattern: /;\s*INSERT\s+INTO/i, name: 'insert-into' },
  { pattern: /;\s*UPDATE\s+.*\s+SET/i, name: 'update-set' },
  { pattern: /--\s*$/m, name: 'sql-comment' },
  { pattern: /\/\*.*\*\//s, name: 'sql-block-comment' },
  { pattern: /xp_cmdshell/i, name: 'xp-cmdshell' },
  { pattern: /sp_executesql/i, name: 'sp-executesql' },
  { pattern: /\bWAITFOR\s+DELAY\b/i, name: 'waitfor-delay' },
  { pattern: /\bBENCHMARK\s*\(/i, name: 'benchmark' },
  { pattern: /\bSLEEP\s*\(/i, name: 'sleep' },
  { pattern: /\bLOAD_FILE\s*\(/i, name: 'load-file' },
  { pattern: /\bINTO\s+OUTFILE\b/i, name: 'into-outfile' },
  { pattern: /\bINTO\s+DUMPFILE\b/i, name: 'into-dumpfile' },
  { pattern: /\bCONCAT\s*\(/i, name: 'concat' },
  { pattern: /\bCHAR\s*\(\s*\d+/i, name: 'char-encoding' },
  { pattern: /\bHEX\s*\(/i, name: 'hex' },
  { pattern: /\b0x[0-9a-f]{8,}/i, name: 'hex-literal' },
  { pattern: /information_schema/i, name: 'information-schema' },
  { pattern: /\bsysobjects\b/i, name: 'sysobjects' },
  { pattern: /\bsyscolumns\b/i, name: 'syscolumns' },
  { pattern: /\bmaster\.\.sysdatabases\b/i, name: 'master-sysdatabases' },
  { pattern: /\bexec\s*\(/i, name: 'exec' },
  { pattern: /\bexecute\s*\(/i, name: 'execute' },
]

export interface DetectionResult {
  detected: boolean
  patterns: string[]
}

/**
 * Detect potential SQL injection patterns in input.
 */
export function detectSqlInjection(input: string): DetectionResult {
  if (typeof input !== 'string' || input.length === 0) {
    return { detected: false, patterns: [] }
  }

  const matched: string[] = []
  for (const { pattern, name } of SQL_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      matched.push(name)
    }
  }

  return { detected: matched.length > 0, patterns: matched }
}

// ============================================================
// XSS Detection
// ============================================================

const XSS_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /<script\b/i, name: 'script-tag' },
  { pattern: /<\/script>/i, name: 'script-close-tag' },
  { pattern: /javascript:/i, name: 'javascript-protocol' },
  { pattern: /on\w+\s*=\s*['"]?[^'"]*['"]?/i, name: 'event-handler' },
  { pattern: /onerror\s*=/i, name: 'onerror' },
  { pattern: /onload\s*=/i, name: 'onload' },
  { pattern: /onclick\s*=/i, name: 'onclick' },
  { pattern: /onmouseover\s*=/i, name: 'onmouseover' },
  { pattern: /onfocus\s*=/i, name: 'onfocus' },
  { pattern: /onblur\s*=/i, name: 'onblur' },
  { pattern: /\beval\s*\(/i, name: 'eval' },
  { pattern: /<iframe\b/i, name: 'iframe-tag' },
  { pattern: /<object\b/i, name: 'object-tag' },
  { pattern: /<embed\b/i, name: 'embed-tag' },
  { pattern: /<svg\b/i, name: 'svg-tag' },
  { pattern: /<img\b[^>]*on\w+\s*=/i, name: 'img-event-handler' },
  { pattern: /<body\b[^>]*on\w+\s*=/i, name: 'body-event-handler' },
  { pattern: /data:text\/html/i, name: 'data-text-html' },
  { pattern: /vbscript:/i, name: 'vbscript-protocol' },
  { pattern: /expression\s*\(/i, name: 'css-expression' },
  { pattern: /<style\b/i, name: 'style-tag' },
  { pattern: /<link\b/i, name: 'link-tag' },
  { pattern: /<meta\b/i, name: 'meta-tag' },
  { pattern: /document\.cookie/i, name: 'document-cookie' },
  { pattern: /document\.write/i, name: 'document-write' },
]

/**
 * Detect potential XSS patterns in input.
 */
export function detectXss(input: string): DetectionResult {
  if (typeof input !== 'string' || input.length === 0) {
    return { detected: false, patterns: [] }
  }

  const matched: string[] = []
  for (const { pattern, name } of XSS_PATTERNS) {
    if (pattern.test(input)) {
      matched.push(name)
    }
  }

  return { detected: matched.length > 0, patterns: matched }
}

// ============================================================
// Path Traversal Detection
// ============================================================

const PATH_TRAVERSAL_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /\.\.\//, name: 'dot-dot-slash' },
  { pattern: /\.\.\\/, name: 'dot-dot-backslash' },
  { pattern: /%2e%2e%2f/i, name: 'encoded-dot-dot-slash' },
  { pattern: /%2e%2e\/i/, name: 'encoded-dot-dot-backslash' },
  { pattern: /\.\.%2f/i, name: 'partial-encoded-slash' },
  { pattern: /\.\.%5c/i, name: 'partial-encoded-backslash' },
  { pattern: /\/etc\/passwd/i, name: 'etc-passwd' },
  { pattern: /\/etc\/shadow/i, name: 'etc-shadow' },
  { pattern: /\/proc\/self/i, name: 'proc-self' },
  { pattern: /c:\\windows\\system32/i, name: 'windows-system32' },
  { pattern: /\.\.%c0%af/i, name: 'overlong-utf8-slash' },
]

/**
 * Detect potential path traversal patterns in input.
 */
export function detectPathTraversal(input: string): DetectionResult {
  if (typeof input !== 'string' || input.length === 0) {
    return { detected: false, patterns: [] }
  }

  const matched: string[] = []
  for (const { pattern, name } of PATH_TRAVERSAL_PATTERNS) {
    if (pattern.test(input)) {
      matched.push(name)
    }
  }

  return { detected: matched.length > 0, patterns: matched }
}

// ============================================================
// NoSQL Injection Detection
// ============================================================

const NOSQL_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /\$where\b/i, name: 'dollar-where' },
  { pattern: /\$ne\b/i, name: 'dollar-ne' },
  { pattern: /\$gt\b/i, name: 'dollar-gt' },
  { pattern: /\$lt\b/i, name: 'dollar-lt' },
  { pattern: /\$gte\b/i, name: 'dollar-gte' },
  { pattern: /\$lte\b/i, name: 'dollar-lte' },
  { pattern: /\$in\b/i, name: 'dollar-in' },
  { pattern: /\$nin\b/i, name: 'dollar-nin' },
  { pattern: /\$regex\b/i, name: 'dollar-regex' },
  { pattern: /\$expr\b/i, name: 'dollar-expr' },
  { pattern: /\$func\b/i, name: 'dollar-func' },
]

/**
 * Detect potential NoSQL injection patterns (MongoDB operators).
 */
export function detectNoSqlInjection(input: string): DetectionResult {
  if (typeof input !== 'string' || input.length === 0) {
    return { detected: false, patterns: [] }
  }

  const matched: string[] = []
  for (const { pattern, name } of NOSQL_PATTERNS) {
    if (pattern.test(input)) {
      matched.push(name)
    }
  }

  return { detected: matched.length > 0, patterns: matched }
}

// ============================================================
// Comprehensive Scan
// ============================================================

export interface ScanResult {
  safe: boolean
  sqlInjection: DetectionResult
  xss: DetectionResult
  pathTraversal: DetectionResult
  noSqlInjection: DetectionResult
  allPatterns: string[]
}

/**
 * Scan input for ALL attack patterns (SQLi + XSS + Path Traversal + NoSQL).
 */
export function scanInput(input: string): ScanResult {
  const sql = detectSqlInjection(input)
  const xss = detectXss(input)
  const path = detectPathTraversal(input)
  const nosql = detectNoSqlInjection(input)

  const allPatterns = [...sql.patterns, ...xss.patterns, ...path.patterns, ...nosql.patterns]
  const safe = allPatterns.length === 0

  return {
    safe,
    sqlInjection: sql,
    xss,
    pathTraversal: path,
    noSqlInjection: nosql,
    allPatterns,
  }
}

// ============================================================
// Validators
// ============================================================

/**
 * Validate email format.
 */
export function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * Validate Iranian phone number format.
 * Accepts: 09123456789, +989123456789, 00989123456789
 */
export function isValidIranianPhone(phone: string): boolean {
  if (!phone) return false
  const cleaned = phone.replace(/[\s\-()]/g, '')
  return /^(?:\+98|0098|0)?9\d{9}$/.test(cleaned)
}

/**
 * Validate URL format.
 */
export function isValidUrl(url: string): boolean {
  if (!url || url.length > 2048) return false
  try {
    const parsed = new URL(url)
    return ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    return false
  }
}

/**
 * Validate UUID format (cuid or UUID v4/v7).
 */
export function isValidId(id: string): boolean {
  if (!id) return false
  // CUID: starts with 'c' + alphanumeric
  if (/^c[a-z0-9]{20,}$/i.test(id)) return true
  // UUID v4/v7
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}
