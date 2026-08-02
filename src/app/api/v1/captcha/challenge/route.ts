import { NextResponse } from 'next/server'
import { generateInternalCaptcha } from '@/lib/captcha/captcha-service'

/**
 * GET /api/v1/captcha/challenge
 *
 * Returns a captcha challenge for the configured internal captcha type
 * (image SVG or math question). Used by the register / forgot-password /
 * login forms when an internal captcha is enabled in SystemSettings.
 *
 * Response:
 *   200: { captchaId: string, type: 'image' | 'math', challenge: { svg?: string; question?: string } }
 *   500: Failed to generate captcha
 */
export async function GET() {
  try {
    const challenge = await generateInternalCaptcha()

    return NextResponse.json(challenge)
  } catch (err) {
    console.error('[captcha/challenge] Internal error:', err)
    return NextResponse.json({ error: 'Failed to generate captcha' }, { status: 500 })
  }
}
