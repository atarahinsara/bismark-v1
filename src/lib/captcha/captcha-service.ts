/**
 * BISMARK ERP — Captcha Service
 *
 * Supports:
 *   - Google reCAPTCHA v2
 *   - Cloudflare Turnstile
 *   - Internal image captcha (canvas-based, generated server-side)
 *   - Internal math captcha (simple arithmetic)
 *
 * Configuration is stored in SystemSetting table (configurable from admin panel).
 * Each form (login, register, forgot-password) can have captcha enabled/disabled independently.
 */

import { db } from '@/lib/db'
import crypto from 'crypto'

export type CaptchaType = 'recaptcha' | 'turnstile' | 'image' | 'math' | 'none'

export interface CaptchaConfig {
  type: CaptchaType
  siteKey: string | null
  secretKey: string | null
  enabledLogin: boolean
  enabledRegister: boolean
  enabledForgotPassword: boolean
}

let cachedConfig: { config: CaptchaConfig | null; ts: number } = { config: null, ts: 0 }
const CONFIG_CACHE_MS = 5_000 // 5 seconds

/**
 * Get captcha configuration from database.
 */
export async function getCaptchaConfig(): Promise<CaptchaConfig> {
  // Return cache if fresh
  if (cachedConfig.config && Date.now() - cachedConfig.ts < CONFIG_CACHE_MS) {
    return cachedConfig.config
  }

  try {
    const settings = await db.systemSetting.findMany({
      where: { category: 'captcha' },
    })

    const get = (key: string, fallback: string = ''): string => {
      const s = settings.find((s) => s.key === key)
      return s?.value || fallback
    }

    const config: CaptchaConfig = {
      type: (get('captcha_type', 'none') as CaptchaType) || 'none',
      siteKey: get('captcha_site_key') || null,
      secretKey: get('captcha_secret_key') || null,
      enabledLogin: get('captcha_enabled_login', 'false') === 'true',
      enabledRegister: get('captcha_enabled_register', 'false') === 'true',
      enabledForgotPassword: get('captcha_enabled_forgot', 'false') === 'true',
    }

    cachedConfig = { config, ts: Date.now() }
    return config
  } catch {
    const fallback: CaptchaConfig = {
      type: 'none',
      siteKey: null,
      secretKey: null,
      enabledLogin: false,
      enabledRegister: false,
      enabledForgotPassword: false,
    }
    return fallback
  }
}

/**
 * Check if captcha is required for a given form.
 */
export async function isCaptchaRequired(form: 'login' | 'register' | 'forgot-password'): Promise<boolean> {
  const config = await getCaptchaConfig()
  if (config.type === 'none') return false
  if (form === 'login') return config.enabledLogin
  if (form === 'register') return config.enabledRegister
  if (form === 'forgot-password') return config.enabledForgotPassword
  return false
}

/**
 * Verify captcha token.
 * For recaptcha/turnstile: verifies with the provider's API.
 * For image/math: verifies against the stored answer.
 */
export async function verifyCaptcha(
  token: string,
  remoteIp?: string,
): Promise<{ success: boolean; error?: string }> {
  const config = await getCaptchaConfig()

  if (config.type === 'none') {
    return { success: true }
  }

  if (config.type === 'recaptcha') {
    return verifyReCaptcha(token, config.secretKey!, remoteIp)
  }

  if (config.type === 'turnstile') {
    return verifyTurnstile(token, config.secretKey!, remoteIp)
  }

  if (config.type === 'image' || config.type === 'math') {
    return verifyInternalCaptcha(token)
  }

  return { success: false, error: 'Unknown captcha type' }
}

/**
 * Verify Google reCAPTCHA v2 token.
 */
async function verifyReCaptcha(token: string, secret: string, remoteIp?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const body = new URLSearchParams({
      secret,
      response: token,
      ...(remoteIp ? { remoteip: remoteIp } : {}),
    })

    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })

    const data = await res.json()
    if (data.success) {
      return { success: true }
    }
    return { success: false, error: data['error-codes']?.join(', ') || 'reCAPTCHA verification failed' }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'reCAPTCHA request failed' }
  }
}

/**
 * Verify Cloudflare Turnstile token.
 */
async function verifyTurnstile(token: string, secret: string, remoteIp?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const body = new URLSearchParams({
      secret,
      response: token,
      ...(remoteIp ? { remoteip: remoteIp } : {}),
    })

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })

    const data = await res.json()
    if (data.success) {
      return { success: true }
    }
    return { success: false, error: data['error-codes']?.join(', ') || 'Turnstile verification failed' }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Turnstile request failed' }
  }
}

// ============================================================
// Internal Captcha (image + math)
// ============================================================

// Store captcha sessions in memory (in production, use Redis)
const captchaStore = new Map<string, { answer: string; expiresAt: Date }>()

const INTERNAL_CAPTCHA_EXPIRY_MS = 5 * 60 * 1000 // 5 minutes

// Cleanup expired entries periodically
setInterval(() => {
  const now = new Date()
  for (const [key, val] of captchaStore.entries()) {
    if (val.expiresAt < now) captchaStore.delete(key)
  }
}, 60_000)

/**
 * Generate an internal captcha challenge.
 * Returns a captchaId and the challenge data (image as SVG or math question).
 */
export async function generateInternalCaptcha(): Promise<{
  captchaId: string
  type: 'image' | 'math'
  challenge: { svg?: string; question?: string }
}> {
  const config = await getCaptchaConfig()
  const type = config.type === 'math' ? 'math' : 'image'
  const captchaId = crypto.randomBytes(16).toString('hex')

  if (type === 'math') {
    // Simple arithmetic: a + b or a - b or a * b
    const a = Math.floor(Math.random() * 20) + 1
    const b = Math.floor(Math.random() * 20) + 1
    const ops = ['+', '-', '×'] as const
    const op = ops[Math.floor(Math.random() * ops.length)]
    const answer = op === '+' ? a + b : op === '-' ? a - b : a * b

    captchaStore.set(captchaId, {
      answer: String(answer),
      expiresAt: new Date(Date.now() + INTERNAL_CAPTCHA_EXPIRY_MS),
    })

    return {
      captchaId,
      type: 'math',
      challenge: { question: `${a} ${op} ${b} = ?` },
    }
  }

  // Image captcha — generate a simple SVG with random text
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let text = ''
  for (let i = 0; i < 5; i++) {
    text += chars[Math.floor(Math.random() * chars.length)]
  }

  captchaStore.set(captchaId, {
    answer: text.toUpperCase(),
    expiresAt: new Date(Date.now() + INTERNAL_CAPTCHA_EXPIRY_MS),
  })

  // Generate SVG image
  const svg = generateCaptchaSVG(text)

  return {
    captchaId,
    type: 'image',
    challenge: { svg },
  }
}

/**
 * Verify internal captcha answer.
 * Token format: "captchaId:answer"
 */
async function verifyInternalCaptcha(token: string): Promise<{ success: boolean; error?: string }> {
  const [captchaId, answer] = token.split(':')
  if (!captchaId || !answer) {
    return { success: false, error: 'Invalid captcha token format' }
  }

  const record = captchaStore.get(captchaId)
  if (!record) {
    return { success: false, error: 'Captcha session not found or expired' }
  }

  if (record.expiresAt < new Date()) {
    captchaStore.delete(captchaId)
    return { success: false, error: 'Captcha expired' }
  }

  // Clean up after use (single-use)
  captchaStore.delete(captchaId)

  if (record.answer.toUpperCase() === answer.toUpperCase()) {
    return { success: true }
  }

  return { success: false, error: 'Incorrect captcha answer' }
}

/**
 * Generate a simple SVG captcha image.
 */
function generateCaptchaSVG(text: string): string {
  const width = 200
  const height = 60
  const fontSize = 32

  // Random colors
  const bgColor = '#f0f0f0'
  const textColor = '#333333'
  const noiseColor = '#cccccc'

  // Generate noise lines
  let noiseLines = ''
  for (let i = 0; i < 5; i++) {
    const x1 = Math.random() * width
    const y1 = Math.random() * height
    const x2 = Math.random() * width
    const y2 = Math.random() * height
    noiseLines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${noiseColor}" stroke-width="1"/>`
  }

  // Generate noise dots
  let noiseDots = ''
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * width
    const y = Math.random() * height
    noiseDots += `<circle cx="${x}" cy="${y}" r="1" fill="${noiseColor}"/>`
  }

  // Character positions with slight rotation
  let chars = ''
  const charWidth = width / (text.length + 1)
  for (let i = 0; i < text.length; i++) {
    const x = charWidth * (i + 1)
    const y = height / 2 + fontSize / 3
    const rotation = (Math.random() - 0.5) * 30
    chars += `<text x="${x}" y="${y}" font-size="${fontSize}" font-family="monospace" fill="${textColor}" font-weight="bold" text-anchor="middle" transform="rotate(${rotation} ${x} ${y})">${text[i]}</text>`
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="${bgColor}"/>
    ${noiseLines}
    ${noiseDots}
    ${chars}
  </svg>`
}
