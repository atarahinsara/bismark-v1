'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, ShieldCheck, ShieldAlert, Users, Activity, Lock, Mail, Eye, Clock } from 'lucide-react'

interface SecurityStats {
  totalUsers: number
  activeUsers: number
  mfaEnabledUsers: number
  lockedUsers: number
  pendingUsers: number
  activeSessions: number
  auditLogCount: number
  captchaEnabled: boolean
  emailVerificationRequired: boolean
}

export function SecurityDashboardView() {
  const [stats, setStats] = useState<SecurityStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    try {
      const token = localStorage.getItem('bismark_access_token')
      const res = await fetch('/api/v1/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok && data.stats) {
        // Also fetch security settings
        const settingsRes = await fetch('/api/v1/settings?category=security', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const settingsData = await settingsRes.json()
        const requireEmailVerif = settingsData.settings?.find((s: { key: string; value: string }) => s.key === 'security_require_email_verification')

        const captchaRes = await fetch('/api/v1/settings?category=captcha', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const captchaData = await captchaRes.json()
        const captchaType = captchaData.settings?.find((s: { key: string; value: string }) => s.key === 'captcha_type')

        setStats({
          ...data.stats,
          mfaEnabledUsers: 0, // Will be populated when we add MFA count to stats API
          captchaEnabled: captchaType?.value !== 'none',
          emailVerificationRequired: requireEmailVerif?.value === 'true',
        })
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!stats) {
    return <div className="text-center text-muted-foreground py-8">دریافت آمار ناموفق بود</div>
  }

  return (
    <div className="space-y-6">
      {/* Security Status Banner */}
      <div className={`rounded-lg border p-4 ${stats.captchaEnabled ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
        <div className="flex items-center gap-3">
          {stats.captchaEnabled ? (
            <ShieldCheck className="h-6 w-6 text-emerald-600" />
          ) : (
            <ShieldAlert className="h-6 w-6 text-amber-600" />
          )}
          <div>
            <div className="font-medium">
              {stats.captchaEnabled ? 'سیستم امنیتی فعال' : 'هشدار امنیتی'}
            </div>
            <div className="text-sm text-muted-foreground">
              {stats.captchaEnabled
                ? 'Captcha و احراز هویت ایمیل فعال هستند'
                : 'Captcha غیرفعال است — برای افزایش امنیت فعال کنید'}
            </div>
          </div>
        </div>
      </div>

      {/* Security Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SecurityCard
          icon={<Users className="h-5 w-5" />}
          label="کل کاربران"
          value={stats.totalUsers}
          color="text-blue-600"
          bg="bg-blue-500/10"
        />
        <SecurityCard
          icon={<Lock className="h-5 w-5" />}
          label="کاربران قفل‌شده"
          value={stats.lockedUsers}
          color="text-red-600"
          bg="bg-red-500/10"
        />
        <SecurityCard
          icon={<Shield className="h-5 w-5" />}
          label="کاربران MFA"
          value={stats.mfaEnabledUsers}
          color="text-emerald-600"
          bg="bg-emerald-500/10"
          subtitle={`${stats.totalUsers > 0 ? Math.round((stats.mfaEnabledUsers / stats.totalUsers) * 100) : 0}% کاربران`}
        />
        <SecurityCard
          icon={<Clock className="h-5 w-5" />}
          label="در انتظار تأیید"
          value={stats.pendingUsers}
          color="text-amber-600"
          bg="bg-amber-500/10"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SecurityCard
          icon={<Activity className="h-5 w-5" />}
          label="نشست‌های فعال"
          value={stats.activeSessions}
          color="text-cyan-600"
          bg="bg-cyan-500/10"
        />
        <SecurityCard
          icon={<Eye className="h-5 w-5" />}
          label="لاگ‌های ممیزی"
          value={stats.auditLogCount}
          color="text-orange-600"
          bg="bg-orange-500/10"
        />
        <SecurityCard
          icon={<Shield className="h-5 w-5" />}
          label="Captcha"
          value={stats.captchaEnabled ? 'فعال' : 'غیرفعال'}
          color={stats.captchaEnabled ? 'text-emerald-600' : 'text-red-600'}
          bg={stats.captchaEnabled ? 'bg-emerald-500/10' : 'bg-red-500/10'}
        />
        <SecurityCard
          icon={<Mail className="h-5 w-5" />}
          label="تأیید ایمیل"
          value={stats.emailVerificationRequired ? 'اجباری' : 'اختیاری'}
          color={stats.emailVerificationRequired ? 'text-emerald-600' : 'text-amber-600'}
          bg={stats.emailVerificationRequired ? 'bg-emerald-500/10' : 'bg-amber-500/10'}
        />
      </div>

      {/* Security Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            توصیه‌های امنیتی
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!stats.captchaEnabled && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
              <ShieldAlert className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                <strong>Captcha غیرفعال است.</strong> برای جلوگیری از حملات brute force، Captcha را از Settings → Security فعال کنید.
              </div>
            </div>
          )}
          {stats.mfaEnabledUsers === 0 && (
            <div className="flex items-start gap-2 rounded-md border border-blue-500/30 bg-blue-500/5 p-3">
              <Shield className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                <strong>هیچ کاربری MFA فعال ندارد.</strong> توصیه می‌شود مدیران و کاربران حساس MFA را فعال کنند.
              </div>
            </div>
          )}
          {stats.auditLogCount === 0 && (
            <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/5 p-3">
              <Activity className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                <strong>Audit logging فعال نیست.</strong> هیچ action ای در سیستم ثبت نمی‌شود. این یک نقص امنیتی برای ERP است.
              </div>
            </div>
          )}
          {stats.captchaEnabled && stats.mfaEnabledUsers > 0 && stats.auditLogCount > 0 && (
            <div className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
              <ShieldCheck className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                تمام توصیه‌های امنیتی رعایت شده‌اند. ✅
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SecurityCard({ icon, label, value, color, bg, subtitle }: { icon: React.ReactNode; label: string; value: string | number; color: string; bg: string; subtitle?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="text-2xl font-bold mt-1">{value}</span>
            {subtitle && <span className="text-xs text-muted-foreground mt-0.5">{subtitle}</span>}
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg} ${color}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
