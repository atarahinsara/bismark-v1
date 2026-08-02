import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAdminAuth } from '@/lib/admin-auth'
import { verifyMfaToken } from '@/lib/auth/mfa'

/** POST /api/v1/auth/mfa/disable — Disable MFA (requires current TOTP code) */
export async function POST(req: NextRequest) {
  try {
    const ctx = await getAdminAuth(req)
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const token = String(body.token || '').replace(/\s/g, '')

    if (!token || !/^\d{6}$/.test(token)) {
      return NextResponse.json({ error: 'Valid TOTP token required' }, { status: 422 })
    }

    const user = await db.user.findFirst({
      where: { id: ctx.userId, deletedAt: null },
      select: { id: true, mfaEnabled: true, mfaSecret: true },
    })

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (!user.mfaEnabled) return NextResponse.json({ error: 'MFA not enabled' }, { status: 400 })

    const valid = verifyMfaToken(user.mfaSecret!, token)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid TOTP token' }, { status: 401 })
    }

    await db.user.update({
      where: { id: ctx.userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: null,
        mfaSetupAt: null,
      },
    })

    return NextResponse.json({
      enabled: false,
      message: 'MFA disabled successfully.',
    })
  } catch (err) {
    console.error('[mfa/disable] Error:', err)
    return NextResponse.json({ error: 'MFA disable failed' }, { status: 500 })
  }
}
