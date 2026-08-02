'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Shield, QrCode, CheckCircle2, XCircle, KeyRound, Copy } from 'lucide-react'
import { toast } from 'sonner'

export function MfaSetupView() {
  const [step, setStep] = useState<'idle' | 'qr' | 'verify' | 'enabled' | 'disabled'>('idle')
  const [loading, setLoading] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [otpToken, setOtpToken] = useState('')
  const [mfaStatus, setMfaStatus] = useState<boolean | null>(null)

  async function checkMfaStatus() {
    try {
      const token = localStorage.getItem('bismark_access_token')
      const res = await fetch('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      const enabled = data.data?.user?.mfaEnabled || data.user?.mfaEnabled || false
      setMfaStatus(enabled)
      setStep(enabled ? 'enabled' : 'idle')
    } catch {
      // ignore
    }
  }

  useState(() => {
    checkMfaStatus()
  })

  async function startSetup() {
    setLoading(true)
    try {
      const token = localStorage.getItem('bismark_access_token')
      const res = await fetch('/api/v1/auth/mfa/setup', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Setup failed')

      setQrCode(data.qrCode)
      setSecret(data.secret)
      setBackupCodes(data.backupCodes || [])
      setStep('qr')
      toast.success('QR code generated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'خطا در راه‌اندازی MFA')
    } finally {
      setLoading(false)
    }
  }

  async function verifyToken() {
    if (otpToken.length !== 6) {
      toast.error('کد باید ۶ رقم باشد')
      return
    }
    setLoading(true)
    try {
      const token = localStorage.getItem('bismark_access_token')
      const res = await fetch('/api/v1/auth/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ token: otpToken }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Verification failed')

      setStep('enabled')
      setMfaStatus(true)
      toast.success('MFA با موفقیت فعال شد!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'کد اشتباه است')
    } finally {
      setLoading(false)
    }
  }

  async function disableMfa() {
    if (otpToken.length !== 6) {
      toast.error('کد TOTP برای غیرفعال‌سازی الزامی است')
      return
    }
    setLoading(true)
    try {
      const token = localStorage.getItem('bismark_access_token')
      const res = await fetch('/api/v1/auth/mfa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ token: otpToken }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Disable failed')

      setStep('disabled')
      setMfaStatus(false)
      setOtpToken('')
      toast.success('MFA غیرفعال شد')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'خطا')
    } finally {
      setLoading(false)
    }
  }

  if (mfaStatus === null) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          احراز هویت دو مرحله‌ای (MFA)
          {mfaStatus && <Badge className="bg-emerald-500/15 text-emerald-600">فعال</Badge>}
          {!mfaStatus && <Badge variant="secondary">غیرفعال</Badge>}
        </CardTitle>
        <CardDescription>
          با فعال‌سازی MFA، حساب شما با Google Authenticator یا Microsoft Authenticator محافظت می‌شود
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* MFA Already Enabled - Show disable option */}
        {step === 'enabled' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span className="font-medium text-emerald-700">MFA فعال است</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                حساب شما با TOTP محافظت می‌شود. برای ورود باید کد ۶ رقمی از اپلیکیشن احراز هویت خود وارد کنید.
              </p>
            </div>
            <div className="space-y-2">
              <Label>کد TOTP برای غیرفعال‌سازی</Label>
              <Input
                value={otpToken}
                onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="۱۲۳۴۵۶"
                dir="ltr"
                className="text-center text-lg tracking-widest"
                maxLength={6}
              />
            </div>
            <Button variant="destructive" onClick={disableMfa} disabled={loading || otpToken.length !== 6}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              غیرفعال‌سازی MFA
            </Button>
          </div>
        )}

        {/* QR Code Step */}
        {step === 'qr' && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="inline-block rounded-lg border-2 border-border p-4 bg-white">
                {qrCode && <img src={qrCode} alt="QR Code" width={200} height={200} />}
              </div>
            </div>
            <div className="rounded-md bg-muted/40 p-3 text-sm">
              <p className="font-medium mb-1">دستورالعمل:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Google Authenticator یا Microsoft Authenticator را باز کنید</li>
                <li> روی «+» بزنید و «Scan QR code» را انتخاب کنید</li>
                <li>QR code بالا را اسکن کنید</li>
                <li>کد ۶ رقمی نمایش داده شده را زیر وارد کنید</li>
              </ol>
            </div>
            {secret && (
              <div className="text-xs text-muted-foreground">
                <span>یا کلید را دستی وارد کنید: </span>
                <code className="font-mono bg-muted px-1.5 py-0.5 rounded">{secret}</code>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 inline-flex"
                  onClick={() => { navigator.clipboard.writeText(secret!); toast.success('کپی شد') }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            )}
            <div className="space-y-2">
              <Label>کد تأیید (۶ رقم)</Label>
              <Input
                value={otpToken}
                onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="------"
                dir="ltr"
                className="text-center text-2xl tracking-[0.5em] font-mono"
                maxLength={6}
              />
            </div>
            <Button onClick={verifyToken} disabled={loading || otpToken.length !== 6} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              تأیید و فعال‌سازی
            </Button>
          </div>
        )}

        {/* Backup Codes (shown after QR) */}
        {step === 'qr' && backupCodes.length > 0 && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <KeyRound className="h-4 w-4 text-amber-600" />
              <span className="font-medium text-amber-700">کدهای بازیابی</span>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              این کدها را در جای امن ذخیره کنید. اگر گوشی خود را گم کردید، می‌توانید با این کدها وارد شوید.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((code, i) => (
                <code key={i} className="font-mono text-sm bg-muted px-2 py-1 rounded text-center">{code}</code>
              ))}
            </div>
          </div>
        )}

        {/* Idle - Show setup button */}
        {step === 'idle' && (
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-3 mb-3">
                <Shield className="h-8 w-8 text-muted-foreground" />
                <div>
                  <div className="font-medium">MFA فعال نیست</div>
                  <div className="text-sm text-muted-foreground">حساب خود را با TOTP محافظت کنید</div>
                </div>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1 mb-4">
                <li>✓ محافظت در برابر دسترسی غیرمجاز</li>
                <li>✓ سازگار با Google/Microsoft Authenticator</li>
                <li>✓ کدهای بازیابی اضطراری</li>
              </ul>
            </div>
            <Button onClick={startSetup} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
              شروع راه‌اندازی MFA
            </Button>
          </div>
        )}

        {/* Disabled confirmation */}
        {step === 'disabled' && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <span className="font-medium text-red-700">MFA غیرفعال شد</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              حساب شما دیگر با TOTP محافظت نمی‌شود. توصیه می‌شود دوباره فعال کنید.
            </p>
            <Button className="mt-3" variant="outline" onClick={() => setStep('idle')}>
              فعال‌سازی مجدد
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
