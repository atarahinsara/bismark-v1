/**
 * BISMARK ERP — System Settings Service
 *
 * Manages configurable settings stored in the SystemSetting table.
 * Settings are categorized: general, security, email, captcha, notifications.
 */

import { db } from '@/lib/db'

export interface SettingInput {
  key: string
  value: string
  type?: 'string' | 'boolean' | 'number' | 'json'
  category?: string
  description?: string
  isPublic?: boolean
  tenantId?: string | null
  updatedBy?: string
}

/**
 * Get all settings, optionally filtered by category.
 */
export async function getSettings(options: { category?: string; tenantId?: string | null; publicOnly?: boolean } = {}) {
  const where: Record<string, unknown> = {}

  if (options.category) where.category = options.category
  if (options.tenantId !== undefined) where.tenantId = options.tenantId
  if (options.publicOnly) where.isPublic = true

  return db.systemSetting.findMany({
    where,
    orderBy: { category: 'asc' },
  })
}

/**
 * Get a single setting by key.
 */
export async function getSetting(key: string, tenantId?: string | null): Promise<string | null> {
  const setting = await db.systemSetting.findFirst({
    where: { key, tenantId: tenantId ?? null },
  })
  return setting?.value || null
}

/**
 * Get a setting as boolean.
 */
export async function getSettingBool(key: string, defaultValue: boolean = false, tenantId?: string | null): Promise<boolean> {
  const value = await getSetting(key, tenantId)
  if (value === null) return defaultValue
  return value === 'true' || value === '1'
}

/**
 * Upsert a setting.
 */
export async function setSetting(input: SettingInput) {
  return db.systemSetting.upsert({
    where: {
      tenantId_key: {
        tenantId: input.tenantId ?? null,
        key: input.key,
      },
    },
    update: {
      value: input.value,
      type: input.type || 'string',
      category: input.category || 'general',
      description: input.description,
      isPublic: input.isPublic ?? false,
      updatedBy: input.updatedBy,
    },
    create: {
      tenantId: input.tenantId ?? null,
      key: input.key,
      value: input.value,
      type: input.type || 'string',
      category: input.category || 'general',
      description: input.description,
      isPublic: input.isPublic ?? false,
      updatedBy: input.updatedBy,
    },
  })
}

/**
 * Bulk upsert settings.
 */
export async function setSettings(inputs: SettingInput[]) {
  const results = []
  for (const input of inputs) {
    const result = await setSetting(input)
    results.push(result)
  }
  return results
}

/**
 * Initialize default settings (called on first run).
 */
export async function initializeDefaultSettings(tenantId?: string | null) {
  const defaults: SettingInput[] = [
    // Email settings
    { key: 'smtp_host', value: '', category: 'email', type: 'string', description: 'SMTP server host' },
    { key: 'smtp_port', value: '587', category: 'email', type: 'number', description: 'SMTP server port' },
    { key: 'smtp_username', value: '', category: 'email', type: 'string', description: 'SMTP username' },
    { key: 'smtp_password', value: '', category: 'email', type: 'string', description: 'SMTP password' },
    { key: 'smtp_encryption', value: 'tls', category: 'email', type: 'string', description: 'Encryption: none, ssl, or tls' },
    { key: 'smtp_sender_name', value: 'BISMARK ERP', category: 'email', type: 'string', description: 'Sender display name' },
    { key: 'smtp_sender_email', value: '', category: 'email', type: 'string', description: 'Sender email address' },

    // Captcha settings
    { key: 'captcha_type', value: 'none', category: 'captcha', type: 'string', description: 'Captcha type: none, recaptcha, turnstile, image, math' },
    { key: 'captcha_site_key', value: '', category: 'captcha', type: 'string', description: 'Captcha site key (for recaptcha/turnstile)' },
    { key: 'captcha_secret_key', value: '', category: 'captcha', type: 'string', description: 'Captcha secret key' },
    { key: 'captcha_enabled_login', value: 'false', category: 'captcha', type: 'boolean', description: 'Enable captcha on login form' },
    { key: 'captcha_enabled_register', value: 'true', category: 'captcha', type: 'boolean', description: 'Enable captcha on register form' },
    { key: 'captcha_enabled_forgot', value: 'true', category: 'captcha', type: 'boolean', description: 'Enable captcha on forgot password form' },

    // Security settings
    { key: 'security_max_login_attempts', value: '5', category: 'security', type: 'number', description: 'Max failed login attempts before lockout' },
    { key: 'security_lockout_duration', value: '15', category: 'security', type: 'number', description: 'Account lockout duration (minutes)' },
    { key: 'security_session_timeout', value: '480', category: 'security', type: 'number', description: 'Session absolute timeout (minutes)' },
    { key: 'security_require_email_verification', value: 'true', category: 'security', type: 'boolean', description: 'Require email verification before login' },

    // General settings
    { key: 'general_app_name', value: 'BISMARK ERP', category: 'general', type: 'string', description: 'Application name', isPublic: true },
    { key: 'general_default_locale', value: 'fa-IR', category: 'general', type: 'string', description: 'Default locale', isPublic: true },
    { key: 'general_support_email', value: '', category: 'general', type: 'string', description: 'Support email address', isPublic: true },
  ]

  for (const d of defaults) {
    const existing = await db.systemSetting.findFirst({
      where: { key: d.key, tenantId: d.tenantId ?? null },
    })
    if (!existing) {
      await setSetting({ ...d, tenantId })
    }
  }
}
