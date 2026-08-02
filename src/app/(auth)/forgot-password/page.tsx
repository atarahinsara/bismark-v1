'use client'
import { parseApiError } from '@/lib/errors/translate-error'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, KeyRound, MailCheck } from 'lucide-react'
import { toast } from 'sonner'

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [email, setEmail] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      // Always show success (don't reveal if email exists)
      setSent(true)
      toast.success('درخواست بازیابی ارسال شد')
    } catch {
      setSent(true) // still show success
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <MailCheck className="h-8 w-8 text-emerald-600" />
          </div>
          <CardTitle className="text-2xl">ایمیل را بررسی کنید</CardTitle>
          <CardDescription>
            اگر ایمیلی با این آدرس ثبت شده باشد، لینک بازیابی رمز عبور ارسال شده است.
            لینک تا ۱ ساعت معتبر است.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/">
            <Button className="w-full" variant="outline">بازگشت به ورود</Button>
          </Link>
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
        <CardTitle className="text-2xl">فراموشی رمز عبور</CardTitle>
        <CardDescription>ایمیل خود را وارد کنید تا لینک بازیابی ارسال شود</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">ایمیل</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              dir="ltr"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            ارسال لینک بازیابی
          </Button>
          <div className="text-center text-sm text-muted-foreground">
            <Link href="/" className="text-primary hover:underline">
              بازگشت به ورود
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
