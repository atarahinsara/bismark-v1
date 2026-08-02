'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Save, Lock, User, Mail, Phone } from 'lucide-react'
import { toast } from 'sonner'

interface UserInfo {
  id: string
  username: string
  email: string | null
  displayName: string
  phone: string | null
  avatarUrl: string | null
}

export function ProfileView() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })

  useEffect(() => {
    fetchUser()
  }, [])

  async function fetchUser() {
    try {
      const token = localStorage.getItem('bismark_access_token')
      const res = await fetch('/api/v1/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok) {
        setUser(data.data?.user || data.user)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveProfile() {
    if (!user) return
    setSaving(true)
    try {
      // Note: profile update API would go here — for now just toast
      toast.info('برای به‌روزرسانی پروفایل، از API مخصوص آن استفاده کنید')
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword() {
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error('رمز جدید و تکرار آن یکسان نیستند')
      return
    }
    setSaving(true)
    try {
      const token = localStorage.getItem('bismark_access_token')
      const res = await fetch('/api/v1/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          oldPassword: pwForm.oldPassword,
          newPassword: pwForm.newPassword,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('رمز عبور تغییر یافت — نشست‌های دیگر باطل شدند')
        setPwForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
        setShowPasswordForm(false)
      } else {
        throw new Error(data.error || data.detail || 'خطا')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'خطا در تغییر رمز')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user) {
    return <div className="text-center text-muted-foreground py-8">اطلاعات کاربر یافت نشد</div>
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            اطلاعات پروفایل
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>نام نمایشی</Label>
              <Input
                value={user.displayName}
                onChange={(e) => setUser({ ...user, displayName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Mail className="h-3 w-3" /> ایمیل</Label>
              <Input
                value={user.email || ''}
                onChange={(e) => setUser({ ...user, email: e.target.value })}
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>نام کاربری</Label>
              <Input value={user.username} disabled className="bg-muted/50" />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Phone className="h-3 w-3" /> تلفن</Label>
              <Input
                value={user.phone || ''}
                onChange={(e) => setUser({ ...user, phone: e.target.value })}
                dir="ltr"
                placeholder="اختیاری"
              />
            </div>
          </div>
          <Button onClick={handleSaveProfile} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            ذخیره تغییرات
          </Button>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            تغییر رمز عبور
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showPasswordForm ? (
            <Button variant="outline" onClick={() => setShowPasswordForm(true)}>
              <Lock className="h-4 w-4" />
              تغییر رمز عبور
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>رمز فعلی</Label>
                <Input
                  type="password"
                  value={pwForm.oldPassword}
                  onChange={(e) => setPwForm({ ...pwForm, oldPassword: e.target.value })}
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label>رمز جدید</Label>
                <Input
                  type="password"
                  value={pwForm.newPassword}
                  onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                  dir="ltr"
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label>تکرار رمز جدید</Label>
                <Input
                  type="password"
                  value={pwForm.confirmPassword}
                  onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                  dir="ltr"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleChangePassword} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  تغییر رمز
                </Button>
                <Button variant="outline" onClick={() => setShowPasswordForm(false)}>
                  انصراف
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
