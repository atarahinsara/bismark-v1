import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAdminAuth } from '@/lib/admin-auth'
import { verifyMfaToken } from '@/lib/auth/mfa'

/** POST /api/v1/auth/mfa/verify — Verify TOTP code and activate MFA */
export async function POST(req: NextRequest) {
  try {
    const ctx = await getAdminAuth(req)
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const token = String(body.token || '').replace(/\s/g, '')

    if (!token || token.length !== 6 || !/^\d{6}$/.test(token)) {
      return NextResponse.json({ error: 'Token must be 6 digits', code: 'INVALID_FORMAT' }, { status: 422 })
    }

    const user = await db.user.findFirst({
      where: { id: ctx.userId, deletedAt: null },
      select: { id: true, mfaEnabled: true, mfaSecret: true },
    })

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (user.mfaEnabled) return NextResponse.json({ error: 'MFA already enabled' }, { status: 409 })
    if (!user.mfaSecret) return NextResponse.json({ error: 'Call POST /auth/mfa/setup first' }, { status: 400 })

    const valid = verifyMfaToken(user.mfaSecret, token)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid TOTP token', code: 'MFA_TOKEN_INVALID' }, { status: 401 })
    }

    await db.user.update({
      where: { id: ctx.userId },
      data: { mfaEnabled: true, mfaSetupAt: new Date(), lastMfaAt: new Date() },
    })

    return NextResponse.json({
      enabled: true,
      message: 'MFA enabled successfully. You will need TOTP code on next login.',
    })
  } catch (err) {
    console.error('[mfa/verify] Error:', err)
    return NextResponse.json({ error: 'MFA verification failed' }, { status: 500 })
  }
}
