/**
 * BISMARK ERP — Input Sanitizer Tests
 *
 * Phase 4: Security Hardening
 */

import { describe, it, expect } from 'vitest'
import {
  sanitizeString,
  sanitizeObject,
  detectSqlInjection,
  detectXss,
  detectPathTraversal,
  detectNoSqlInjection,
  scanInput,
  isValidEmail,
  isValidIranianPhone,
  isValidUrl,
  isValidId,
} from '@/lib/input-sanitizer'

// ============================================================
// Sanitize String
// ============================================================
describe('sanitizeString', () => {
  it('trims whitespace by default', () => {
    expect(sanitizeString('  hello  ')).toBe('hello')
  })

  it('encodes HTML entities', () => {
    expect(sanitizeString('<script>')).toBe('&lt;script&gt;')
    expect(sanitizeString('"quote"')).toBe('&quot;quote&quot;')
    expect(sanitizeString("it's")).toBe('it&#x27;s')
  })

  it('enforces max length', () => {
    expect(sanitizeString('hello world', { maxLength: 5 })).toBe('hello')
  })

  it('allows HTML when allowHtml=true', () => {
    expect(sanitizeString('<b>bold</b>', { allowHtml: true })).toBe('<b>bold</b>')
  })

  it('handles non-string input', () => {
    expect(sanitizeString(null as any)).toBe('')
    expect(sanitizeString(undefined as any)).toBe('')
    expect(sanitizeString(123 as any)).toBe('')
  })
})

// ============================================================
// Sanitize Object
// ============================================================
describe('sanitizeObject', () => {
  it('sanitizes all string values in nested object', () => {
    const obj = { name: '<script>', data: { bio: 'hello<script>' } }
    const result = sanitizeObject(obj)
    expect(result.name).toBe('&lt;script&gt;')
    expect(result.data.bio).toBe('hello&lt;script&gt;')
  })

  it('sanitizes arrays', () => {
    const arr = ['<script>', 'normal', { x: '<img>' }]
    const result = sanitizeObject(arr)
    expect(result[0]).toBe('&lt;script&gt;')
    expect(result[1]).toBe('normal')
    expect(result[2].x).toBe('&lt;img&gt;')
  })

  it('preserves non-string values', () => {
    const obj = { num: 42, bool: true, n: null }
    const result = sanitizeObject(obj)
    expect(result.num).toBe(42)
    expect(result.bool).toBe(true)
    expect(result.n).toBe(null)
  })
})

// ============================================================
// SQL Injection Detection
// ============================================================
describe('detectSqlInjection', () => {
  it('detects classic OR 1=1', () => {
    const result = detectSqlInjection("' OR '1'='1")
    expect(result.detected).toBe(true)
    expect(result.patterns.length).toBeGreaterThan(0)
  })

  it('detects UNION SELECT', () => {
    expect(detectSqlInjection('1 UNION SELECT * FROM users').detected).toBe(true)
  })

  it('detects DROP TABLE', () => {
    expect(detectSqlInjection('; DROP TABLE users').detected).toBe(true)
  })

  it('detects xp_cmdshell', () => {
    expect(detectSqlInjection('xp_cmdshell').detected).toBe(true)
  })

  it('detects SLEEP()', () => {
    expect(detectSqlInjection('SLEEP(5)').detected).toBe(true)
  })

  it('detects information_schema', () => {
    expect(detectSqlInjection('information_schema.tables').detected).toBe(true)
  })

  it('allows normal text', () => {
    expect(detectSqlInjection('Hello World').detected).toBe(false)
    expect(detectSqlInjection('محمد رضایی').detected).toBe(false)
    expect(detectSqlInjection('order #12345').detected).toBe(false)
  })

  it('handles empty input', () => {
    expect(detectSqlInjection('').detected).toBe(false)
    expect(detectSqlInjection(null as any).detected).toBe(false)
  })
})

// ============================================================
// XSS Detection
// ============================================================
describe('detectXss', () => {
  it('detects <script> tag', () => {
    expect(detectXss('<script>alert(1)</script>').detected).toBe(true)
  })

  it('detects javascript: protocol', () => {
    expect(detectXss('javascript:alert(1)').detected).toBe(true)
  })

  it('detects onerror handler', () => {
    expect(detectXss('<img src=x onerror=alert(1)>').detected).toBe(true)
  })

  it('detects eval()', () => {
    expect(detectXss('eval(alert(1))').detected).toBe(true)
  })

  it('detects <iframe>', () => {
    expect(detectXss('<iframe src="evil.com">').detected).toBe(true)
  })

  it('detects document.cookie', () => {
    expect(detectXss('document.cookie').detected).toBe(true)
  })

  it('allows normal text', () => {
    expect(detectXss('Hello World').detected).toBe(false)
    expect(detectXss('example@email.com').detected).toBe(false)
  })
})

// ============================================================
// Path Traversal Detection
// ============================================================
describe('detectPathTraversal', () => {
  it('detects ../', () => {
    expect(detectPathTraversal('../../../etc/passwd').detected).toBe(true)
  })

  it('detects ..\\', () => {
    expect(detectPathTraversal('..\\..\\windows').detected).toBe(true)
  })

  it('detects encoded %2e%2e', () => {
    expect(detectPathTraversal('%2e%2e%2f').detected).toBe(true)
  })

  it('detects /etc/passwd', () => {
    expect(detectPathTraversal('/etc/passwd').detected).toBe(true)
  })

  it('allows normal paths', () => {
    expect(detectPathTraversal('/home/user/docs').detected).toBe(false)
    expect(detectPathTraversal('C:\\Users\\docs').detected).toBe(false)
  })
})

// ============================================================
// NoSQL Injection Detection
// ============================================================
describe('detectNoSqlInjection', () => {
  it('detects $where', () => {
    expect(detectNoSqlInjection('$where: function() { ... }').detected).toBe(true)
  })

  it('detects $ne', () => {
    expect(detectNoSqlInjection('{"$ne": null}').detected).toBe(true)
  })

  it('detects $gt', () => {
    expect(detectNoSqlInjection('{"$gt": ""}').detected).toBe(true)
  })

  it('allows normal text', () => {
    expect(detectNoSqlInjection('Hello World').detected).toBe(false)
  })
})

// ============================================================
// Comprehensive Scan
// ============================================================
describe('scanInput', () => {
  it('detects multiple attack types', () => {
    const result = scanInput("<script>' OR '1'='1; ../../../etc/passwd")
    expect(result.safe).toBe(false)
    expect(result.sqlInjection.detected).toBe(true)
    expect(result.xss.detected).toBe(true)
    expect(result.pathTraversal.detected).toBe(true)
    expect(result.allPatterns.length).toBeGreaterThanOrEqual(3)
  })

  it('returns safe for normal input', () => {
    const result = scanInput('Hello World')
    expect(result.safe).toBe(true)
    expect(result.allPatterns.length).toBe(0)
  })
})

// ============================================================
// Validators
// ============================================================
describe('Validators', () => {
  it('isValidEmail', () => {
    expect(isValidEmail('user@example.com')).toBe(true)
    expect(isValidEmail('invalid')).toBe(false)
    expect(isValidEmail('')).toBe(false)
  })

  it('isValidIranianPhone', () => {
    expect(isValidIranianPhone('09123456789')).toBe(true)
    expect(isValidIranianPhone('+989123456789')).toBe(true)
    expect(isValidIranianPhone('00989123456789')).toBe(true)
    expect(isValidIranianPhone('12345')).toBe(false)
  })

  it('isValidUrl', () => {
    expect(isValidUrl('https://example.com')).toBe(true)
    expect(isValidUrl('http://localhost:3000')).toBe(true)
    expect(isValidUrl('not-a-url')).toBe(false)
    expect(isValidUrl('ftp://example.com')).toBe(false)
  })

  it('isValidId (CUID)', () => {
    expect(isValidId('cm1234567890abcdefghijklmnop')).toBe(true)
    expect(isValidId('01910000-0000-7000-8000-000000000001')).toBe(true)
    expect(isValidId('invalid-id')).toBe(false)
    expect(isValidId('')).toBe(false)
  })
})
