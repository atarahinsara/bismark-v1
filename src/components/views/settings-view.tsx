'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Save, Mail, Shield, Settings as SettingsIcon, Send } from 'lucide-react'
import { toast } from 'sonner'

interface Setting {
  id: string
  key: string
  value: string
  type: string
  category: string
  description: string | null
  isPublic: boolean
}

export function SettingsView() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)
  const [testEmailTo, setTestEmailTo] = useState('')

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    try {
      const token = localStorage.getItem('bismark_access_token')
      const res = await fetch('/api/v1/settings', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok) {
        setSettings(data.settings || [])
      } else {
        toast.error(data.error || data.detail || 'دسترسی غیرمجاز')
      }
    } catch {
      toast.error('خطا در دریافت تنظیمات')
    } finally {
      setLoading(false)
    }
  }

  function updateSetting(key: string, value: string) {
    setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s))
  }

  async function saveSettings(category: string) {
    setSaving(true)
    try {
      const token = localStorage.getItem('bismark_access_token')
      const toSave = settings
        .filter(s => s.category === category)
        .map(s => ({ key: s.key, value: s.value }))
      const res = await fetch('/api/v1/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ settings: toSave }),
      })
      if (res.ok) {
        toast.success('تنظیمات ذخیره شد')
      } else {
        throw new Error('خطا')
      }
    } catch {
      toast.error('خطا در ذخیره')
    } finally {
      setSaving(false)
    }
  }

  async function sendTestEmail() {
    if (!testEmailTo) {
      toast.error('ایمیل مقصد را وارد کنید')
      return
    }
    setTestingEmail(true)
    try {
      const token = localStorage.getItem('bismark_access_token')
      const res = await fetch('/api/v1/settings/email-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ to: testEmailTo }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success('ایمیل تست ارسال شد')
      } else {
        toast.error(data.error || 'ارسال ایمیل ناموفق بود — تنظیمات SMTP را بررسی کنید')
      }
    } catch {
      toast.error('خطا در ارسال ایمیل')
    } finally {
      setTestingEmail(false)
    }
  }

  function getSetting(key: string): Setting | undefined {
    return settings.find(s => s.key === key)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const emailSettings = settings.filter(s => s.category === 'email')
  const captchaSettings = settings.filter(s => s.category === 'captcha')
  const securitySettings = settings.filter(s => s.category === 'security')
  const generalSettings = settings.filter(s => s.category === 'general')

  return (
    <div className="max-w-3xl">
      <Tabs defaultValue="email">
        <TabsList className="grid grid-cols-4">
          <TabsTrigger value="email" className="gap-1"><Mail className="h-4 w-4" /> ایمیل</TabsTrigger>
          <TabsTrigger value="captcha" className="gap-1"><Shield className="h-4 w-4" /> کپچا</TabsTrigger>
          <TabsTrigger value="security" className="gap-1"><Shield className="h-4 w-4" /> امنیت</TabsTrigger>
          <TabsTrigger value="general" className="gap-1"><SettingsIcon className="h-4 w-4" /> عمومی</TabsTrigger>
        </TabsList>

        {/* Email Settings */}
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> تنظیمات SMTP</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>SMTP Host</Label>
                  <Input value={getSetting('smtp_host')?.value || ''} onChange={e => updateSetting('smtp_host', e.target.value)} dir="ltr" placeholder="smtp.gmail.com" />
                </div>
                <div className="space-y-2">
                  <Label>پورت</Label>
                  <Input value={getSetting('smtp_port')?.value || ''} onChange={e => updateSetting('smtp_port', e.target.value)} dir="ltr" placeholder="587" />
                </div>
                <div className="space-y-2">
                  <Label>نام کاربری</Label>
                  <Input value={getSetting('smtp_username')?.value || ''} onChange={e => updateSetting('smtp_username', e.target.value)} dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label>رمز عبور</Label>
                  <Input type="password" value={getSetting('smtp_password')?.value || ''} onChange={e => updateSetting('smtp_password', e.target.value)} dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label>رمزنگاری</Label>
                  <Input value={getSetting('smtp_encryption')?.value || ''} onChange={e => updateSetting('smtp_encryption', e.target.value)} dir="ltr" placeholder="tls" />
                </div>
                <div className="space-y-2">
                  <Label>نام فرستنده</Label>
                  <Input value={getSetting('smtp_sender_name')?.value || ''} onChange={e => updateSetting('smtp_sender_name', e.target.value)} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>ایمیل فرستنده</Label>
                  <Input value={getSetting('smtp_sender_email')?.value || ''} onChange={e => updateSetting('smtp_sender_email', e.target.value)} dir="ltr" />
                </div>
              </div>
              <Button onClick={() => saveSettings('email')} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                ذخیره تنظیمات ایمیل
              </Button>

              <div className="border-t pt-4">
                <Label>تست ارسال ایمیل</Label>
                <div className="flex gap-2 mt-2">
                  <Input value={testEmailTo} onChange={e => setTestEmailTo(e.target.value)} placeholder="email@example.com" dir="ltr" />
                  <Button onClick={sendTestEmail} disabled={testingEmail} variant="outline">
                    {testingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    ارسال تست
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Captcha Settings */}
        <TabsContent value="captcha">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> تنظیمات Captcha</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>نوع Captcha</Label>
                <Input value={getSetting('captcha_type')?.value || 'none'} onChange={e => updateSetting('captcha_type', e.target.value)} dir="ltr" placeholder="none|recaptcha|turnstile|image|math" />
                <p className="text-xs text-muted-foreground">انواع: none, recaptcha, turnstile, image, math</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Site Key</Label>
                  <Input value={getSetting('captcha_site_key')?.value || ''} onChange={e => updateSetting('captcha_site_key', e.target.value)} dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label>Secret Key</Label>
                  <Input type="password" value={getSetting('captcha_secret_key')?.value || ''} onChange={e => updateSetting('captcha_secret_key', e.target.value)} dir="ltr" />
                </div>
              </div>
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label>فعال در صفحه ورود</Label>
                  <Switch
                    checked={getSetting('captcha_enabled_login')?.value === 'true'}
                    onCheckedChange={v => updateSetting('captcha_enabled_login', v ? 'true' : 'false')}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>فعال در صفحه ثبت‌نام</Label>
                  <Switch
                    checked={getSetting('captcha_enabled_register')?.value === 'true'}
                    onCheckedChange={v => updateSetting('captcha_enabled_register', v ? 'true' : 'false')}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>فعال در فراموشی رمز</Label>
                  <Switch
                    checked={getSetting('captcha_enabled_forgot')?.value === 'true'}
                    onCheckedChange={v => updateSetting('captcha_enabled_forgot', v ? 'true' : 'false')}
                  />
                </div>
              </div>
              <Button onClick={() => saveSettings('captcha')} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                ذخیره تنظیمات Captcha
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> تنظیمات امنیتی</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>تأیید ایمیل اجباری</Label>
                  <p className="text-xs text-muted-foreground">کاربران قبل از تأیید ایمیل نمی‌توانند وارد شوند</p>
                </div>
                <Switch
                  checked={getSetting('security_require_email_verification')?.value === 'true'}
                  onCheckedChange={v => updateSetting('security_require_email_verification', v ? 'true' : 'false')}
                />
              </div>
              <Button onClick={() => saveSettings('security')} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                ذخیره تنظیمات امنیتی
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><SettingsIcon className="h-5 w-5" /> تنظیمات عمومی</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>نام برنامه</Label>
                  <Input value={getSetting('general_app_name')?.value || ''} onChange={e => updateSetting('general_app_name', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>زبان پیش‌فرض</Label>
                  <Input value={getSetting('general_default_locale')?.value || ''} onChange={e => updateSetting('general_default_locale', e.target.value)} dir="ltr" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>ایمیل پشتیبانی</Label>
                  <Input value={getSetting('general_support_email')?.value || ''} onChange={e => updateSetting('general_support_email', e.target.value)} dir="ltr" />
                </div>
              </div>
              <Button onClick={() => saveSettings('general')} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                ذخیره تنظیمات عمومی
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
