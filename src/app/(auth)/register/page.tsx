'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, UserPlus, CheckCircle2, Mail, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { parseApiError } from '@/lib/errors/translate-error'

export default function RegisterPage() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [devLink, setDevLink] = useState<string | null>(null)
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
  })

  const passwordStrength = (() => {
    const p = form.password
    if (!p) return 0
    let score = 0
    if (p.length >= 8) score++
    if (/[A-Z]/.test(p)) score++
    if (/[a-z]/.test(p)) score++
    if (/[0-9]/.test(p)) score++
    if (/[^A-Za-z0-9]/.test(p)) score++
    return score
  })()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (form.password !== form.confirmPassword) {
      toast.error('رمز عبور و تکرار آن یکسان نیستند')
      return
    }

    setLoading(true)
    setDevLink(null)
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username,
          email: form.email,
          password: form.password,
          displayName: form.displayName || undefined,
        }),
      })

      if (!res.ok) {
        const errorMsg = await parseApiError(res)
        toast.error(errorMsg)
        return
      }

      const data = await res.json()
      setSuccess(true)

      // In dev mode, show the verification link
      if (data.devVerificationLink) {
        setDevLink(data.devVerificationLink)
        toast.success('ثبت‌نام موفق بود! لینک تأیید آماده است.')
      } else {
        toast.success('ثبت‌نام موفق بود! ایمیل خود را بررسی کنید.')
      }
    } catch {
      toast.error('خطای شبکه. اتصال اینترنت را بررسی کنید.')
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
          <CardTitle className="text-2xl">ثبت‌نام موفق بود!</CardTitle>
          <CardDescription className="flex items-center justify-center gap-1">
            <Mail className="h-4 w-4" />
            برای فعال‌سازی حساب، ایمیل خود را بررسی کنید.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {devLink && (
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 space-y-2">
              <p className="text-sm font-medium text-blue-700">
                🔧 حالت توسعه: لینک تأیید
              </p>
              <p className="text-xs text-muted-foreground">
                SMTP تنظیم نشده، بنابراین لینک تأیید اینجا نمایش داده می‌شود:
              </p>
              <Link
                href={devLink}
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline font-mono break-all"
              >
                {devLink.slice(0, 60)}...
                <ExternalLink className="h-3 w-3 shrink-0" />
              </Link>
              <div className="flex gap-2 pt-1">
                <Link href={devLink} className="flex-1">
                  <Button size="sm" className="w-full">
                    تأیید ایمیل
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigator.clipboard.writeText(devLink)}
                >
                  کپی لینک
                </Button>
              </div>
            </div>
          )}
          <Link href="/" className="block">
            <Button className="w-full" variant="outline">
              بازگشت به ورود
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-primary">
          <UserPlus className="h-8 w-8 text-primary-foreground" />
        </div>
        <CardTitle className="text-2xl">ثبت‌نام</CardTitle>
        <CardDescription>یک حساب کاربری جدید ایجاد کنید</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">نام نمایشی</Label>
            <Input
              id="displayName"
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              placeholder="نام و نام خانوادگی"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">نام کاربری *</Label>
            <Input
              id="username"
              required
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="username"
              minLength={3}
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">ایمیل *</Label>
            <Input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="email@example.com"
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">رمز عبور *</Label>
            <Input
              id="password"
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="حداقل ۸ کاراکتر"
              dir="ltr"
              minLength={8}
            />
            {form.password && (
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded ${
                      i <= passwordStrength
                        ? passwordStrength <= 2
                          ? 'bg-red-500'
                          : passwordStrength <= 3
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                        : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              حداقل ۸ کاراکتر شامل حروف بزرگ، کوچک و عدد
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">تکرار رمز عبور *</Label>
            <Input
              id="confirmPassword"
              type="password"
              required
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              placeholder="تکرار رمز عبور"
              dir="ltr"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            ثبت‌نام
          </Button>
          <div className="text-center text-sm text-muted-foreground">
            حساب کاربری دارید؟{' '}
            <Link href="/" className="text-primary hover:underline">
              وارد شوید
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
