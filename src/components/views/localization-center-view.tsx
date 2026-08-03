'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Globe, CheckCircle2, AlertCircle, FileText, Download, Search, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'

interface LanguageStats {
  code: string
  name: string
  nativeName: string
  flag: string
  dir: 'rtl' | 'ltr'
  totalKeys: number
  translatedKeys: number
  missingKeys: number
  coverage: number
}

interface ModuleStats {
  module: string
  fa: number
  en: number
  ar: number
  ku: number
}

export function LocalizationCenterView() {
  const [languages, setLanguages] = useState<LanguageStats[]>([])
  const [modules, setModules] = useState<ModuleStats[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    // Static data based on our module structure
    // In production, this would come from an API
    const langData: LanguageStats[] = [
      { code: 'fa', name: 'Persian', nativeName: 'فارسی', flag: '🇮🇷', dir: 'rtl', totalKeys: 220, translatedKeys: 220, missingKeys: 0, coverage: 100 },
      { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', dir: 'ltr', totalKeys: 220, translatedKeys: 220, missingKeys: 0, coverage: 100 },
      { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', dir: 'rtl', totalKeys: 220, translatedKeys: 220, missingKeys: 0, coverage: 100 },
      { code: 'ku', name: 'Kurdish', nativeName: 'کوردی', flag: '🇮🇶', dir: 'rtl', totalKeys: 220, translatedKeys: 220, missingKeys: 0, coverage: 100 },
    ]
    setLanguages(langData)

    const moduleData: ModuleStats[] = [
      { module: 'common', fa: 32, en: 32, ar: 32, ku: 32 },
      { module: 'auth', fa: 7, en: 7, ar: 7, ku: 7 },
      { module: 'profile', fa: 20, en: 20, ar: 20, ku: 20 },
      { module: 'sessions', fa: 18, en: 18, ar: 18, ku: 18 },
      { module: 'notifications', fa: 11, en: 11, ar: 11, ku: 11 },
      { module: 'settings', fa: 27, en: 27, ar: 27, ku: 27 },
      { module: 'language', fa: 5, en: 5, ar: 5, ku: 5 },
      { module: 'admin', fa: 56, en: 56, ar: 56, ku: 56 },
      { module: 'dashboard', fa: 6, en: 6, ar: 6, ku: 6 },
      { module: 'warehouse', fa: 7, en: 7, ar: 7, ku: 7 },
      { module: 'warranty', fa: 6, en: 6, ar: 6, ku: 6 },
      { module: 'service', fa: 6, en: 6, ar: 6, ku: 6 },
      { module: 'errors', fa: 12, en: 12, ar: 12, ku: 12 },
      { module: 'validation', fa: 7, en: 7, ar: 7, ku: 7 },
    ]
    setModules(moduleData)
    setLoading(false)
  }, [])

  if (loading) {
    return <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
  }

  const totalKeys = languages[0]?.totalKeys || 0
  const avgCoverage = languages.reduce((sum, l) => sum + l.coverage, 0) / languages.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6" />
            مرکز بومی‌سازی
          </h2>
          <p className="text-sm text-muted-foreground mt-1">مدیریت ترجمه‌های سیستم برای {languages.length} زبان</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => toast.info('خروجی JSON آماده شد')}>
            <Download className="h-4 w-4" /> خروجی ترجمه‌ها
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground">زبان‌های فعال</span>
                <div className="text-2xl font-bold mt-1">{languages.length}</div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                <Globe className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground">کلیدهای ترجمه</span>
                <div className="text-2xl font-bold mt-1">{totalKeys}</div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600">
                <FileText className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground">میانگین پوشش</span>
                <div className="text-2xl font-bold mt-1 text-emerald-600">{avgCoverage.toFixed(0)}%</div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground">کلیدهای ناقص</span>
                <div className="text-2xl font-bold mt-1 text-amber-600">
                  {languages.reduce((sum, l) => sum + l.missingKeys, 0)}
                </div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                <AlertCircle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="languages">
        <TabsList>
          <TabsTrigger value="languages">زبان‌ها</TabsTrigger>
          <TabsTrigger value="modules">ماژول‌ها</TabsTrigger>
          <TabsTrigger value="architecture">معماری</TabsTrigger>
        </TabsList>

        {/* Languages Tab */}
        <TabsContent value="languages" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {languages.map((lang) => (
              <Card key={lang.code}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{lang.flag}</span>
                      <div>
                        <CardTitle className="text-base">{lang.nativeName}</CardTitle>
                        <CardDescription className="text-xs">
                          {lang.name} • {lang.dir.toUpperCase()} • کد: {lang.code}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={lang.coverage === 100 ? 'default' : 'secondary'}
                      className={lang.coverage === 100 ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600'}>
                      {lang.coverage === 100 ? <CheckCircle2 className="h-3 w-3 ml-1" /> : <AlertCircle className="h-3 w-3 ml-1" />}
                      {lang.coverage}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">پوشش ترجمه</span>
                      <span>{lang.translatedKeys}/{lang.totalKeys} کلید</span>
                    </div>
                    <Progress value={lang.coverage} className="h-2" />
                  </div>
                  {lang.missingKeys > 0 && (
                    <div className="flex items-center gap-2 text-xs text-amber-600">
                      <AlertCircle className="h-3 w-3" />
                      {lang.missingKeys} کلید ترجمه نشده
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Search className="h-3 w-3" /> مشاهده کلیدها
                    </Button>
                    <Button size="sm" variant="outline">
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Modules Tab */}
        <TabsContent value="modules">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">آمار ماژول‌های ترجمه</CardTitle>
              <CardDescription>۱۴ ماژول مستقل — هر ماژول ترجمه‌های خود را دارد</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-right py-2 px-3 font-medium">ماژول</th>
                      <th className="text-center py-2 px-3">🇮🇷 فارسی</th>
                      <th className="text-center py-2 px-3">🇺🇸 English</th>
                      <th className="text-center py-2 px-3">🇸🇦 العربية</th>
                      <th className="text-center py-2 px-3">🇮🇶 کوردی</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modules.map((mod) => (
                      <tr key={mod.module} className="border-b hover:bg-muted/30">
                        <td className="py-2 px-3 font-mono text-xs">{mod.module}.json</td>
                        <td className="text-center py-2 px-3">
                          <Badge variant="outline" className="text-xs">{mod.fa}</Badge>
                        </td>
                        <td className="text-center py-2 px-3">
                          <Badge variant="outline" className="text-xs">{mod.en}</Badge>
                        </td>
                        <td className="text-center py-2 px-3">
                          <Badge variant="outline" className="text-xs">{mod.ar}</Badge>
                        </td>
                        <td className="text-center py-2 px-3">
                          <Badge variant="outline" className="text-xs">{mod.ku}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-bold">
                      <td className="py-2 px-3">مجموع</td>
                      <td className="text-center py-2 px-3">{modules.reduce((s, m) => s + m.fa, 0)}</td>
                      <td className="text-center py-2 px-3">{modules.reduce((s, m) => s + m.en, 0)}</td>
                      <td className="text-center py-2 px-3">{modules.reduce((s, m) => s + m.ar, 0)}</td>
                      <td className="text-center py-2 px-3">{modules.reduce((s, m) => s + m.ku, 0)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Architecture Tab */}
        <TabsContent value="architecture">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">معماری بومی‌سازی Enterprise</CardTitle>
              <CardDescription>ساختار ماژولار برای مقیاس‌پذیری ۱۰ ساله</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border p-4 font-mono text-xs space-y-2">
                <div className="text-muted-foreground">messages/</div>
                <div className="ps-4">
                  <div>├── fa/ <span className="text-muted-foreground"># Persian (RTL)</span></div>
                  <div className="ps-4">
                    <div>├── common.json <span className="text-muted-foreground"># 32 keys</span></div>
                    <div>├── auth.json <span className="text-muted-foreground"># 7 keys</span></div>
                    <div>├── dashboard.json <span className="text-muted-foreground"># 6 keys</span></div>
                    <div>├── warehouse.json <span className="text-muted-foreground"># 7 keys</span></div>
                    <div>├── warranty.json <span className="text-muted-foreground"># 6 keys</span></div>
                    <div>├── service.json <span className="text-muted-foreground"># 6 keys</span></div>
                    <div>├── errors.json <span className="text-muted-foreground"># 12 keys</span></div>
                    <div>├── validation.json <span className="text-muted-foreground"># 7 keys</span></div>
                    <div>└── ... <span className="text-muted-foreground"># 6 more modules</span></div>
                  </div>
                  <div>├── en/ <span className="text-muted-foreground"># English (LTR)</span></div>
                  <div>├── ar/ <span className="text-muted-foreground"># Arabic (RTL)</span></div>
                  <div>└── ku/ <span className="text-muted-foreground"># Kurdish (RTL)</span></div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="font-medium text-sm">قابلیت‌های فعال</span>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>✅ ۱۴ ماژول مستقل ترجمه</li>
                    <li>✅ ۴ زبان (FA/EN/AR/KU)</li>
                    <li>✅ RTL/LTR خودکار</li>
                    <li>✅ تشخیص زبان (Cookie/Browser)</li>
                    <li>✅ Fallback به English</li>
                    <li>✅ Language Switcher</li>
                  </ul>
                </div>
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <span className="font-medium text-sm">در حال توسعه</span>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>⚠️ جایگزینی متن‌های hardcoded</li>
                    <li>⚠️ ترجمه منوی پویا</li>
                    <li>⚠️ ترجمه دیتابیس (محتوا)</li>
                    <li>⚠️ AI Translation API</li>
                    <li>⚠️ Import/Export JSON</li>
                    <li>⚠️ تشخیص خودکار کلید جدید</li>
                  </ul>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <h4 className="text-sm font-medium mb-2">قوانین معماری</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>📌 هیچ متن hardcodedی نباید در کد باشد — همه از <code className="bg-muted px-1 rounded">t('module.key')</code> استفاده کنند</li>
                  <li>📌 هر ماژول جدید باید فایل ترجمه مخصوص خود را داشته باشد</li>
                  <li>📌 اگر کلید پیدا نشد، اول به English، سپس به نام کلید fallback شود</li>
                  <li>📌 زبان RTL/LTR باید خودکار بر اساس زبان فعال تغییر کند</li>
                  <li>📌 افزودن زبان جدید نباید نیاز به تغییر کد داشته باشد</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
