'use client'
import { parseApiError } from '@/lib/errors/translate-error'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, KeyRound, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

function ResetPasswordContent() {
  const router = useRouter()
  const params = useSearchParams()
  const tokenFromUrl = params.get('token')
  const [token, setToken] = useState(tokenFromUrl || '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast.error('رمز عبور و تکرار آن یکسان نیستند')
      return
    }
    if (password.length < 8) {
      toast.error('رمز عبور باید حداقل ۸ کاراکتر باشد')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess(true)
        toast.success('رمز عبور تغییر یافت')
      } else {
        throw new Error(data.error || data.detail || 'خطا')
      }
    } catch (err) {
      const msg = await parseApiError(res); toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <CardTitle className="text-2xl">رمز عبور تغییر یافت</CardTitle>
          <CardDescription>اکنون می‌توانید با رمز جدید وارد شوید.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={() => router.push('/')}>
            ورود به حساب
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-primary">
          <KeyRound className="h-8 w-8 text-primary-foreground" />
        </div>
        <CardTitle className="text-2xl">تعیین رمز جدید</CardTitle>
        <CardDescription>رمز عبور جدید خود را وارد کنید</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">رمز عبور جدید</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="حداقل ۸ کاراکتر"
              dir="ltr"
              minLength={8}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">تکرار رمز عبور</Label>
            <Input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="تکرار رمز"
              dir="ltr"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !token}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            تغییر رمز
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <ResetPasswordContent />
    </Suspense>
  )
}
