import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAdminAuth } from '@/lib/admin-auth'
import { generateMfaSecret, generateOtpAuthUri, generateBackupCodes, hashBackupCode } from '@/lib/auth/mfa'
import QRCode from 'qrcode'

/** POST /api/v1/auth/mfa/setup — Initialize MFA, returns QR code + backup codes */
export async function POST(req: NextRequest) {
  try {
    const ctx = await getAdminAuth(req)
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await db.user.findFirst({
      where: { id: ctx.userId, deletedAt: null },
      select: { id: true, email: true, username: true, mfaEnabled: true, mfaSecret: true },
    })

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (user.mfaEnabled) return NextResponse.json({ error: 'MFA already enabled' }, { status: 409 })

    const secret = generateMfaSecret()
    const otpAuthUri = generateOtpAuthUri(user.email || user.username, secret)
    const backupCodesPlain = generateBackupCodes()
    const backupCodesHashed = await Promise.all(backupCodesPlain.map(hashBackupCode))

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUri, {
      width: 200,
      margin: 1,
      color: { dark: '000000', light: '#ffffff' },
    })

    await db.user.update({
      where: { id: ctx.userId },
      data: { mfaSecret: secret, mfaBackupCodes: backupCodesHashed },
    })

    return NextResponse.json({
      secret,
      otpAuthUri,
      qrCode: qrCodeDataUrl,
      backupCodes: backupCodesPlain,
      message: 'Scan QR code with authenticator app, then verify with POST /auth/mfa/verify',
    })
  } catch (err) {
    console.error('[mfa/setup] Error:', err)
    return NextResponse.json({ error: 'MFA setup failed' }, { status: 500 })
  }
}
