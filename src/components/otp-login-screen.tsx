'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, Shield, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

interface OtpLoginScreenProps {
  username: string
  password: string
  onBack: () => void
  onSuccess: (token: string) => void
}

export function OtpLoginScreen({ username, password, onBack, onSuccess }: OtpLoginScreenProps) {
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (otp.length !== 6) {
      toast.error('کد باید ۶ رقم باشد')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, mfaToken: otp }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail || data.error || 'کد اشتباه است')
      }
      const token = data.data?.accessToken
      if (token) {
        localStorage.setItem('bismark_access_token', token)
        if (data.data?.refreshToken) {
          localStorage.setItem('bismark_refresh_token', data.data.refreshToken)
        }
        onSuccess(token)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'خطا در تأیید کد')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">تأیید هویت دو مرحله‌ای</CardTitle>
        <CardDescription>کد ۶ رقمی نمایش داده شده در اپلیکیشن احراز هویت خود را وارد کنید</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp" className="text-center block">کد تأیید</Label>
            <Input
              id="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="------"
              dir="ltr"
              className="text-center text-2xl tracking-[0.5em] font-mono"
              maxLength={6}
              autoFocus
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
            تأیید و ورود
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={onBack}>
            <ArrowRight className="h-4 w-4" />
            بازگشت
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
