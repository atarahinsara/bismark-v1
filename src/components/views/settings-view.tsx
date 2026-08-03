'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Save, Mail, Shield, Settings as SettingsIcon, Send, CheckCircle2, XCircle, AlertCircle, FileText, Eye } from 'lucide-react'
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

interface EmailStatus {
  configured: boolean
  host: string
  port: string
  username: string
  encryption: string
  senderName: string
  senderEmail: string
}

export function SettingsView() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)
  const [testEmailTo, setTestEmailTo] = useState('')
  const [emailResult, setEmailResult] = useState<{ success: boolean; message: string } | null>(null)
  const [activeTab, setActiveTab] = useState('email')

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('bismark_access_token')
      const res = await fetch('/api/v1/settings', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok) setSettings(data.settings || [])
    } catch {
      toast.error('خطا در دریافت تنظیمات')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  function getSetting(key: string): Setting | undefined {
    return settings.find(s => s.key === key)
  }

  function updateSetting(key: string, value: string) {
    setSettings(prev => {
      const existing = prev.find(s => s.key === key)
      if (existing) {
        return prev.map(s => s.key === key ? { ...s, value } : s)
      }
      // Create new setting with default category based on key prefix
      const category = key.startsWith('smtp') || key.startsWith('email') ? 'email'
                     : key.startsWith('captcha') ? 'captcha'
                     : key.startsWith('security') ? 'security'
                     : 'general'
      return [...prev, { id: key, key, value, type: 'string', category, description: null, isPublic: false }]
    })
  }

  async function saveSettings(category: string) {
    setSaving(true)
    try {
      const token = localStorage.getItem('bismark_access_token')
      const toSave = settings
        .filter(s => s.category === category)
        .map(s => ({ key: s.key, value: s.value, category: s.category }))

      const res = await fetch('/api/v1/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ settings: toSave }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      toast.success('تنظیمات ذخیره شد')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'ذخیره ناموفق')
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
    setEmailResult(null)
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
        setEmailResult({ success: true, message: `ایمیل تست با موفقیت به ${testEmailTo} ارسال شد` })
        toast.success('ایمیل ارسال شد!')
      } else {
        const errorMsg = data.error || 'ارسال ناموفق'
        setEmailResult({ success: false, message: errorMsg })
        toast.error(errorMsg)
      }
    } catch {
      setEmailResult({ success: false, message: 'خطای شبکه' })
      toast.error('خطای شبکه')
    } finally {
      setTestingEmail(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const emailConfigured = getSetting('smtp_host')?.value && getSetting('smtp_username')?.value

  return (
    <div className="max-w-3xl space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="email" className="gap-1"><Mail className="h-4 w-4" /> ایمیل</TabsTrigger>
          <TabsTrigger value="templates" className="gap-1"><FileText className="h-4 w-4" /> قالب‌ها</TabsTrigger>
          <TabsTrigger value="security" className="gap-1"><Shield className="h-4 w-4" /> امنیت</TabsTrigger>
          <TabsTrigger value="general" className="gap-1"><SettingsIcon className="h-4 w-4" /> عمومی</TabsTrigger>
        </TabsList>

        {/* ====== EMAIL TAB ====== */}
        <TabsContent value="email" className="space-y-4">
          {/* Status Banner */}
          <div className={`rounded-lg border p-4 ${emailConfigured ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
            <div className="flex items-center gap-3">
              {emailConfigured ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-600" />
              )}
              <div>
                <div className="font-medium text-sm">
                  {emailConfigured ? 'SMTP پیکربندی شده' : 'SMTP پیکربندی نشده'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {emailConfigured
                    ? `متصل به ${getSetting('smtp_host')?.value}:${getSetting('smtp_port')?.value} | کاربر: ${getSetting('smtp_username')?.value}`
                    : 'برای ارسال ایمیل، تنظیمات SMTP را پر کنید'}
                </div>
              </div>
              {emailConfigured && (
                <Badge variant="outline" className="mr-auto text-emerald-600 border-emerald-500/30">
                  فعال
                </Badge>
              )}
            </div>
          </div>

          {/* SMTP Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="h-5 w-5" />
                تنظیمات SMTP
              </CardTitle>
              <CardDescription>سرور ایمیل خروجی را پیکربندی کنید</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>SMTP Host</Label>
                  <Input
                    value={getSetting('smtp_host')?.value || ''}
                    onChange={e => updateSetting('smtp_host', e.target.value)}
                    placeholder="smtp.gmail.com"
                    dir="ltr"
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label>پورت</Label>
                  <Input
                    value={getSetting('smtp_port')?.value || ''}
                    onChange={e => updateSetting('smtp_port', e.target.value)}
                    placeholder="587"
                    dir="ltr"
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label>ایمیل کاربر (Username)</Label>
                  <Input
                    value={getSetting('smtp_username')?.value || ''}
                    onChange={e => updateSetting('smtp_username', e.target.value)}
                    placeholder="you@gmail.com"
                    dir="ltr"
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label>رمز عبور / App Password</Label>
                  <Input
                    type="password"
                    value={getSetting('smtp_password')?.value || ''}
                    onChange={e => updateSetting('smtp_password', e.target.value)}
                    placeholder="••••••••••••••••"
                    dir="ltr"
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label>رمزنگاری</Label>
                  <Select
                    value={getSetting('smtp_encryption')?.value || 'tls'}
                    onValueChange={v => updateSetting('smtp_encryption', v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون رمزنگاری</SelectItem>
                      <SelectItem value="tls">TLS</SelectItem>
                      <SelectItem value="ssl">SSL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>نام فرستنده</Label>
                  <Input
                    value={getSetting('smtp_sender_name')?.value || ''}
                    onChange={e => updateSetting('smtp_sender_name', e.target.value)}
                    placeholder="BISMARK ERP"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>ایمیل فرستنده</Label>
                  <Input
                    value={getSetting('smtp_sender_email')?.value || ''}
                    onChange={e => updateSetting('smtp_sender_email', e.target.value)}
                    placeholder="noreply@bismark.com"
                    dir="ltr"
                    className="font-mono text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button onClick={() => saveSettings('email')} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  ذخیره تنظیمات ایمیل
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Test Email */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Send className="h-5 w-5" />
                تست ارسال ایمیل
              </CardTitle>
              <CardDescription>یک ایمیل تست به آدرس مشخص‌شده ارسال کنید</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={testEmailTo}
                  onChange={e => setTestEmailTo(e.target.value)}
                  placeholder="email@example.com"
                  dir="ltr"
                  className="flex-1"
                />
                <Button onClick={sendTestEmail} disabled={testingEmail || !emailConfigured}>
                  {testingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  ارسال تست
                </Button>
              </div>

              {/* Result Display */}
              {emailResult && (
                <div className={`rounded-lg border p-4 ${
                  emailResult.success
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-red-500/30 bg-red-500/5'
                }`}>
                  <div className="flex items-start gap-3">
                    {emailResult.success ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium text-sm ${
                        emailResult.success ? 'text-emerald-700' : 'text-red-700'
                      }`}>
                        {emailResult.success ? 'ارسال موفق' : 'ارسال ناموفق'}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1 break-words">
                        {emailResult.message}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Help */}
              {!emailConfigured && (
                <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
                  <p className="font-medium mb-1">راهنمای تنظیم Gmail:</p>
                  <ol className="list-decimal list-inside space-y-0.5">
                    <li>به https://myaccount.google.com/security بروید</li>
                    <li>2-Step Verification را فعال کنید</li>
                    <li>App Passwords را بسازید</li>
                    <li>رمز ۱۶ کاراکتری را در فیلد رمز عبور وارد کنید</li>
                  </ol>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ====== TEMPLATES TAB ====== */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-5 w-5" />
                قالب‌های ایمیل
              </CardTitle>
              <CardDescription>متن و ظاهر ایمیل‌های سیستم را مدیریت کنید</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'email_template_verify_subject', label: 'موضوع ایمیل تأیید', default: 'تأیید ایمیل — BISMARK ERP' },
                { key: 'email_template_reset_subject', label: 'موضوع بازیابی رمز', default: 'بازیابی رمز عبور — BISMARK ERP' },
                { key: 'email_template_login_subject', label: 'موضوع ورود جدید', default: 'ورود جدید به حساب — BISMARK ERP' },
              ].map(({ key, label, default: def }) => (
                <div key={key} className="space-y-2">
                  <Label>{label}</Label>
                  <Input
                    value={getSetting(key)?.value || def}
                    onChange={e => updateSetting(key, e.target.value)}
                    placeholder={def}
                  />
                </div>
              ))}

              <div className="space-y-2">
                <Label>قالب ایمیل تأیید (HTML)</Label>
                <Textarea
                  value={getSetting('email_template_verify_body')?.value || ''}
                  onChange={e => updateSetting('email_template_verify_body', e.target.value)}
                  placeholder="<div dir='rtl'>...</div>"
                  rows={6}
                  dir="ltr"
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">متغیرها: {'{name}'}, {'{link}'}, {'{app_name}'}</p>
              </div>

              <div className="space-y-2">
                <Label>قالب ایمیل بازیابی رمز (HTML)</Label>
                <Textarea
                  value={getSetting('email_template_reset_body')?.value || ''}
                  onChange={e => updateSetting('email_template_reset_body', e.target.value)}
                  placeholder="<div dir='rtl'>...</div>"
                  rows={6}
                  dir="ltr"
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">متغیرها: {'{name}'}, {'{link}'}, {'{app_name}'}</p>
              </div>

              <Button onClick={() => saveSettings('email')} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                ذخیره قالب‌ها
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ====== SECURITY TAB ====== */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-5 w-5" />
                تنظیمات امنیتی
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label>تأیید ایمیل اجباری</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">کاربران قبل از تأیید ایمیل نمی‌توانند وارد شوند</p>
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

        {/* ====== GENERAL TAB ====== */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <SettingsIcon className="h-5 w-5" />
                تنظیمات عمومی
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>نام برنامه</Label>
                  <Input
                    value={getSetting('general_app_name')?.value || ''}
                    onChange={e => updateSetting('general_app_name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>زبان پیش‌فرض</Label>
                  <Select
                    value={getSetting('general_default_locale')?.value || 'fa-IR'}
                    onValueChange={v => updateSetting('general_default_locale', v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fa-IR">فارسی</SelectItem>
                      <SelectItem value="en-US">English</SelectItem>
                      <SelectItem value="ar-SA">العربية</SelectItem>
                      <SelectItem value="ku-IQ">کوردی</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>ایمیل پشتیبانی</Label>
                  <Input
                    value={getSetting('general_support_email')?.value || ''}
                    onChange={e => updateSetting('general_support_email', e.target.value)}
                    placeholder="support@bismark.com"
                    dir="ltr"
                  />
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
