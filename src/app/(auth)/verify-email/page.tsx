'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle2, XCircle, MailCheck } from 'lucide-react'
import { toast } from 'sonner'

function VerifyEmailContent() {
  const params = useSearchParams()
  const tokenFromUrl = params.get('token')
  const [token, setToken] = useState(tokenFromUrl || '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function verify(t?: string) {
    const useToken = t || token
    if (!useToken) {
      toast.error('توکن تأیید الزامی است')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/v1/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: useToken }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult('success')
        setMessage(data.message || 'ایمیل شما تأیید شد.')
      } else {
        setResult('error')
        setMessage(data.error || data.detail || 'خطا در تأیید ایمیل')
      }
    } catch {
      setResult('error')
      setMessage('خطا در ارتباط با سرور')
    } finally {
      setLoading(false)
    }
  }

  // Auto-verify if token in URL
  useEffect(() => {
    if (tokenFromUrl) {
      verify(tokenFromUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenFromUrl])

  if (result === 'success') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <CardTitle className="text-2xl">ایمیل تأیید شد!</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/">
            <Button className="w-full">ورود به حساب</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  if (result === 'error') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl">خطا در تأیید</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/">
            <Button className="w-full" variant="outline">بازگشت</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-primary">
          <MailCheck className="h-8 w-8 text-primary-foreground" />
        </div>
        <CardTitle className="text-2xl">تأیید ایمیل</CardTitle>
        <CardDescription>توکن تأیید را وارد کنید یا روی لینک ایمیل کلیک کنید</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="token">توکن تأیید</Label>
          <Input
            id="token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="توکن از ایمیل"
            dir="ltr"
          />
        </div>
        <Button onClick={() => verify()} className="w-full" disabled={loading || !token}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}
          تأیید ایمیل
        </Button>
      </CardContent>
    </Card>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <VerifyEmailContent />
    </Suspense>
  )
}
