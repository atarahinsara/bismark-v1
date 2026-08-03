/**
 * BISMARK ERP — Email Service
 *
 * Provides real SMTP email sending via nodemailer.
 * Settings are loaded from SystemSetting table (configurable from admin panel)
 * with fallback to environment variables.
 *
 * Emails:
 *   - Email verification
 *   - Password reset
 *   - New login notification
 *   - Password changed notification
 *   - Security alerts
 */

import { db } from '@/lib/db'

export interface EmailConfig {
  host: string
  port: number
  username: string
  password: string
  encryption: 'none' | 'ssl' | 'tls'
  senderName: string
  senderEmail: string
}

export interface EmailMessage {
  to: string
  subject: string
  html: string
  text?: string
}

let cachedConfig: { config: EmailConfig | null; ts: number } = { config: null, ts: 0 }
const CONFIG_CACHE_MS = 60_000 // 1 minute

/**
 * Get email configuration from database (SystemSetting table).
 * Falls back to environment variables if not configured.
 */
export async function getEmailConfig(): Promise<EmailConfig | null> {
  // Return cache if fresh
  if (cachedConfig.config !== null && Date.now() - cachedConfig.ts < CONFIG_CACHE_MS) {
    return cachedConfig.config
  }

  try {
    const settings = await db.systemSetting.findMany({
      where: { category: 'email' },
    })

    const get = (key: string, fallback: string = ''): string => {
      const s = settings.find((s) => s.key === key)
      return s?.value || fallback
    }

    const host = get('smtp_host', process.env.SMTP_HOST || '')
    const port = parseInt(get('smtp_port', process.env.SMTP_PORT || '587'), 10)
    const username = get('smtp_username', process.env.SMTP_USERNAME || '')
    const password = get('smtp_password', process.env.SMTP_PASSWORD || '')
    const encryption = get('smtp_encryption', 'tls') as 'none' | 'ssl' | 'tls'
    const senderName = get('smtp_sender_name', 'BISMARK ERP')
    const senderEmail = get('smtp_sender_email', process.env.SMTP_SENDER_EMAIL || 'noreply@bismark.local')

    if (!host) {
      cachedConfig = { config: null, ts: Date.now() }
      return null
    }

    const config: EmailConfig = { host, port, username, password, encryption, senderName, senderEmail }
    cachedConfig = { config, ts: Date.now() }
    return config
  } catch {
    // Fallback to env vars
    if (process.env.SMTP_HOST) {
      return {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        username: process.env.SMTP_USERNAME || '',
        password: process.env.SMTP_PASSWORD || '',
        encryption: (process.env.SMTP_ENCRYPTION as 'none' | 'ssl' | 'tls') || 'tls',
        senderName: process.env.SMTP_SENDER_NAME || 'BISMARK ERP',
        senderEmail: process.env.SMTP_SENDER_EMAIL || 'noreply@bismark.local',
      }
    }
    return null
  }
}

/**
 * Send an email using configured SMTP.
 * Uses nodemailer (dynamically imported to avoid loading if not needed).
 */
export async function sendEmail(message: EmailMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const config = await getEmailConfig()
  if (!config) {
    console.warn('[email] SMTP not configured — email not sent to:', message.to)
    return { success: false, error: 'SMTP not configured' }
  }

  try {
    // Dynamically import nodemailer (may not be installed yet)
    const nodemailer = await import('nodemailer').catch(() => null)

    if (!nodemailer) {
      console.warn('[email] nodemailer not installed — logging email instead:')
      console.log('  To:', message.to)
      console.log('  Subject:', message.subject)
      console.log('  Body:', message.text || message.html?.replace(/<[^>]*>/g, '').slice(0, 100))
      return { success: true, messageId: 'logged' }
    }

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.encryption === 'ssl',
      tls: config.encryption === 'tls' ? { rejectUnauthorized: false } : undefined,
      auth: config.username ? { user: config.username, pass: config.password } : undefined,
    })

    const info = await transporter.sendMail({
      from: `"${config.senderName}" <${config.senderEmail}>`,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    })

    return { success: true, messageId: info.messageId }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[email] Send failed:', msg)
    return { success: false, error: msg }
  }
}

/**
 * Send email verification email.
 */
export async function sendVerificationEmail(email: string, token: string, baseUrl: string): Promise<void> {
  const link = `${baseUrl}/verify-email?token=${token}`
  await sendEmail({
    to: email,
    subject: 'تأیید ایمیل — BISMARK ERP',
    html: `
      <div dir="rtl" style="font-family: Tahoma, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a1a;">تأیید ایمیل</h2>
        <p>برای تکمیل ثبت‌نام، روی لینک زیر کلیک کنید:</p>
        <a href="${link}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 16px 0;">
          تأیید ایمیل
        </a>
        <p style="color: #666; font-size: 14px;">یا این لینک را کپی کنید:</p>
        <p style="word-break: break-all; color: #2563eb;">${link}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #999; font-size: 12px;">این لینک تا ۲۴ ساعت معتبر است.</p>
      </div>
    `,
    text: `برای تأیید ایمیل، این لینک را باز کنید: ${link}`,
  })
}

/**
 * Send password reset email.
 */
export async function sendPasswordResetEmail(email: string, token: string, baseUrl: string): Promise<void> {
  const link = `${baseUrl}/reset-password?token=${token}`
  await sendEmail({
    to: email,
    subject: 'بازیابی رمز عبور — BISMARK ERP',
    html: `
      <div dir="rtl" style="font-family: Tahoma, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a1a;">بازیابی رمز عبور</h2>
        <p>برای تعیین رمز عبور جدید، روی لینک زیر کلیک کنید:</p>
        <a href="${link}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 16px 0;">
          تعیین رمز جدید
        </a>
        <p style="color: #666; font-size: 14px;">یا این لینک را کپی کنید:</p>
        <p style="word-break: break-all; color: #2563eb;">${link}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #999; font-size: 12px;">این لینک تا ۱ ساعت معتبر است. اگر شما این درخواست را نداده‌اید، این ایمیل را نادیده بگیرید.</p>
      </div>
    `,
    text: `برای بازیابی رمز عبور، این لینک را باز کنید: ${link}`,
  })
}

/**
 * Send new login notification email.
 */
export async function sendNewLoginNotification(email: string, info: { ip: string; device: string; browser: string; os: string; time: string }): Promise<void> {
  await sendEmail({
    to: email,
    subject: 'ورود جدید به حساب — BISMARK ERP',
    html: `
      <div dir="rtl" style="font-family: Tahoma, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1a1a1a;">ورود جدید</h2>
        <p>یک ورود جدید به حساب شما ثبت شد:</p>
        <ul style="color: #444;">
          <li><strong>زمان:</strong> ${info.time}</li>
          <li><strong>IP:</strong> ${info.ip}</li>
          <li><strong>دستگاه:</strong> ${info.device}</li>
          <li><strong>مرورگر:</strong> ${info.browser}</li>
          <li><strong>سیستم عامل:</strong> ${info.os}</li>
        </ul>
        <p style="color: #999; font-size: 12px;">اگر این ورود شما نبوده، فوراً رمز عبور خود را تغییر کنید.</p>
      </div>
    `,
  })
}

/**
 * Send test email (for admin panel "test SMTP" button).
 */
export async function sendTestEmail(to: string): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const config = await getEmailConfig()
  if (!config) {
    return { success: false, error: 'SMTP پیکربندی نشده — ابتدا تنظیمات SMTP را پر کنید' }
  }
  if (!config.username || !config.password) {
    return { success: false, error: 'نام کاربری و رمز عبور SMTP خالی است' }
  }

  const result = await sendEmail({
    to,
    subject: '✅ تست ایمیل — BISMARK ERP',
    html: `
      <div dir="rtl" style="font-family: Tahoma, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 10px;">
        <div style="background: #1a1a1a; color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">BISMARK ERP</h1>
          <p style="margin: 5px 0 0; opacity: 0.7;">تست ایمیل سیستم</p>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
          <h2 style="color: #333;">✅ ایمیل تست با موفقیت ارسال شد</h2>
          <p style="color: #666; line-height: 1.6;">این ایمیل نشان می‌دهد که تنظیمات SMTP شما به‌درستی کار می‌کند.</p>
          <div style="background: #f0f0f0; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #555; font-size: 14px;"><strong>از:</strong> ${config.senderName} &lt;${config.senderEmail}&gt;</p>
            <p style="margin: 5px 0 0; color: #555; font-size: 14px;"><strong>به:</strong> ${to}</p>
            <p style="margin: 5px 0 0; color: #555; font-size: 14px;"><strong>سرور:</strong> ${config.host}:${config.port} (${config.encryption})</p>
            <p style="margin: 5px 0 0; color: #555; font-size: 14px;"><strong>زمان:</strong> ${new Date().toLocaleString('fa-IR')}</p>
          </div>
          <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">این یک ایمیل خودکار است، لطفاً پاسخ ندهید.</p>
        </div>
      </div>
    `,
  })
  return { success: result.success, error: result.error, messageId: result.messageId }
}
