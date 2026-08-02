'use client'
import { parseApiError } from '@/lib/errors/translate-error'

import { useState, useMemo, useEffect } from 'react'
import {
  LayoutDashboard, Users, UserCog, Building2, Shield, FileText,
  LogOut, Search, Bell, Settings, Menu, X, Sun, Moon, Globe,
  Plus, Edit2, Trash2, Lock, Unlock, Ban, CheckCircle, AlertCircle,
  ChevronLeft, MoreVertical, Mail, Phone, Calendar, User as UserIcon,
  Server, Database, GitBranch, Zap, Check, Filter, Download, Package,
  Warehouse as WarehouseIcon, BookOpen, ArrowRightLeft, ClipboardCheck, ShoppingCart, Truck, Receipt, Undo2, Activity, ShieldCheck, Wrench, Calculator, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useTheme } from 'next-themes'
import { mockUsers, mockRoles, mockParties, mockBranches, dashboardStats } from '@/lib/mock-data'
import { authApi, isAuthenticated, clearAuthTokens, apiFetch, type ApiError } from '@/lib/api-client'
import type { User, Role, Party, UserType, UserStatus, PartyType, PartyStatus } from '@/lib/types'
import { ProductsView } from '@/components/views/products-view'
import { InventoryView } from '@/components/views/inventory-view'
import { InventoryLedgerView } from '@/components/views/inventory-ledger-view'
import { TransfersView } from '@/components/views/transfers-view'
import { CycleCountView } from '@/components/views/cycle-count-view'
import { SalesView } from '@/components/views/sales-view'
import { FulfillmentView } from '@/components/views/fulfillment-view'
import { BillingView } from '@/components/views/billing-view'
import { ReturnsView } from '@/components/views/returns-view'
import { IntegrationView } from '@/components/views/integration-view'
import { WarrantyView } from '@/components/views/warranty-view'
import { ServiceView } from '@/components/views/service-view'
import { FinancialView } from '@/components/views/financial-view'
import { NotificationDashboardView } from '@/components/views/notification-dashboard-view'
import { NotificationTemplatesView } from '@/components/views/notification-templates-view'
import { NotificationsView } from '@/components/views/notifications-view'
import { NotificationPreferencesView } from '@/components/views/notification-preferences-view'
import { ProfileView } from '@/components/views/profile-view'
import { SessionsView } from '@/components/views/sessions-view'
import { NotificationsInboxView } from '@/components/views/notifications-inbox-view'
import { SettingsView as AccountSettingsView } from '@/components/views/settings-view'
import { LanguageSwitcher } from '@/components/language-switcher'
import Link from 'next/link'

type View = 'dashboard' | 'users' | 'roles' | 'parties' | 'products' | 'inventory' | 'inventory-ledger' | 'transfers' | 'cycle-counts' | 'sales' | 'fulfillment' | 'billing' | 'returns' | 'warranty' | 'service' | 'financial' | 'integration' | 'branches' | 'audit' | 'settings' | 'notification-dashboard' | 'notification-templates' | 'notifications' | 'notification-preferences' | 'profile' | 'sessions' | 'inbox' | 'account-settings'

const userTypeLabels: Record<UserType, string> = {
  customer: 'مشتری',
  representative: 'نماینده',
  technician: 'تکنسین',
  service_center: 'مرکز خدمات',
  staff: 'کارمند',
}

const statusLabels: Record<UserStatus, string> = {
  active: 'فعال',
  suspended: 'معلق',
  locked: 'قفل‌شده',
  deleted: 'حذف‌شده',
}

const statusVariants: Record<UserStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  suspended: 'secondary',
  locked: 'destructive',
  deleted: 'outline',
}

const partyTypeLabels: Record<PartyType, string> = {
  person: 'شخص حقیقی',
  organization: 'سازمان',
}

const partyStatusLabels: Record<PartyStatus, string> = {
  active: 'فعال',
  inactive: 'غیرفعال',
  suspended: 'معلق',
  blacklisted: 'لیست سیاه',
}

function timeAgo(date: string | null): string {
  if (!date) return '—'
  const diff = Date.now() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'همین الان'
  if (minutes < 60) return `${minutes} دقیقه پیش`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ساعت پیش`
  const days = Math.floor(hours / 24)
  return `${days} روز پیش`
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' })
}

// ============================================================
// LOGIN SCREEN
// ============================================================
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('demo1234')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await authApi.login(username, password)
      onLogin()
    } catch (err: any) {
      const apiErr = err as ApiError
      setError(apiErr?.detail || apiErr?.message || 'ورود ناموفق بود')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-4 shadow-lg shadow-primary/20">
            <Server className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">BISMARK ERP</h1>
          <p className="text-muted-foreground mt-2">سامانه برنامه‌ریزی منابع سازمانی</p>
          <p className="text-xs text-muted-foreground mt-1">Sprint 11 — Authentication & Security</p>
        </div>

        <Card className="shadow-xl border-border/50">
          <CardHeader>
            <CardTitle className="text-2xl">ورود به سیستم</CardTitle>
            <CardDescription>برای ادامه وارد حساب کاربری خود شوید</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">نام کاربری</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">رمز عبور</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="h-11"
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-input" />
                  <span className="text-muted-foreground">مرا به خاطر بسپار</span>
                </label>
                <Link href="/forgot-password" className="p-0 h-auto text-primary text-sm hover:underline">
                  رمز عبور را فراموش کرده‌اید؟
                </Link>
              </div>
              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
                {loading ? <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> در حال ورود...</> : 'ورود'}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t">
              <p className="text-xs text-muted-foreground text-center mb-2">
                💡 پیش‌نمایش — اطلاعات دمو:
              </p>
              <div className="flex justify-center gap-2 flex-wrap">
                <Badge variant="secondary" className="text-xs">admin / demo1234</Badge>
                <Badge variant="secondary" className="text-xs">سوپر ادمین</Badge>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t text-center text-sm">
              <span className="text-muted-foreground">حساب کاربری ندارید؟ </span>
              <Link href="/register" className="text-primary hover:underline font-medium">
                ثبت‌نام کنید
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center gap-4 mt-6 text-xs text-muted-foreground">
          <span>نسخه ۱.۰.۰</span>
          <span>•</span>
          <span>Sprint 1</span>
          <span>•</span>
          <span>Laravel 12 + Next.js 16</span>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// SIDEBAR
// ============================================================
const navGroups = [
  {
    title: 'اصلی',
    items: [
      { view: 'dashboard' as View, label: 'داشبورد', icon: LayoutDashboard },
    ],
  },
  {
    title: 'مدیریت کاربران',
    items: [
      { view: 'users' as View, label: 'کاربران', icon: Users },
      { view: 'roles' as View, label: 'نقش‌ها', icon: Shield },
    ],
  },
  {
    title: 'فروش',
    items: [
      { view: 'sales' as View, label: 'سفارشات فروش', icon: ShoppingCart },
      { view: 'fulfillment' as View, label: 'fulfillment', icon: Truck },
      { view: 'billing' as View, label: 'صورتحساب', icon: Receipt },
      { view: 'returns' as View, label: 'مرجوعی و بازپرداخت', icon: Undo2 },
      { view: 'warranty' as View, label: 'گارانتی', icon: ShieldCheck },
      { view: 'service' as View, label: 'خدمات و تعمیرات', icon: Wrench },
      { view: 'financial' as View, label: 'هسته حسابداری', icon: Calculator },
    ],
  },
  {
    title: 'موجودیت‌ها',
    items: [
      { view: 'parties' as View, label: 'اشخاص و سازمان‌ها', icon: UserCog },
      { view: 'products' as View, label: 'محصولات', icon: Package },
      { view: 'inventory' as View, label: 'انبارها', icon: WarehouseIcon },
      { view: 'inventory-ledger' as View, label: 'موجودی و دفتر کل', icon: BookOpen },
      { view: 'transfers' as View, label: 'انتقالات', icon: ArrowRightLeft },
      { view: 'cycle-counts' as View, label: 'شمارش موجودی', icon: ClipboardCheck },
      { view: 'branches' as View, label: 'شعب', icon: Building2 },
    ],
  },
  {
    title: 'اعلان‌ها',
    items: [
      { view: 'notification-dashboard' as View, label: 'داشبورد اعلان‌ها', icon: Bell },
      { view: 'notifications' as View, label: 'مرکز اعلان‌ها', icon: Bell },
      { view: 'notification-templates' as View, label: 'الگوهای اعلان', icon: FileText },
      { view: 'notification-preferences' as View, label: 'ترجیحات اعلان', icon: Settings },
    ],
  },
  {
    title: 'حساب کاربری',
    items: [
      { view: 'profile' as View, label: 'پروفایل', icon: UserIcon },
      { view: 'sessions' as View, label: 'نشست‌های فعال', icon: Shield },
      { view: 'inbox' as View, label: 'اعلان‌ها', icon: Bell },
      { view: 'account-settings' as View, label: 'تنظیمات سیستم', icon: Settings },
    ],
  },
  {
    title: 'سیستم',
    items: [
      { view: 'integration' as View, label: 'داشبورد یکپارچگی', icon: Activity },
      { view: 'audit' as View, label: 'لاگ ممیزی', icon: FileText },
      { view: 'settings' as View, label: 'تنظیمات', icon: Settings },
    ],
  },
]

function Sidebar({ currentView, onViewChange, mobileOpen, onMobileClose }: {
  currentView: View
  onViewChange: (v: View) => void
  mobileOpen: boolean
  onMobileClose: () => void
}) {
  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onMobileClose} />
      )}

      <aside className={`
        fixed lg:static inset-y-0 right-0 z-50 lg:z-auto
        w-72 bg-sidebar border-l border-sidebar-border
        flex flex-col h-screen overflow-hidden
        transform transition-transform duration-200
        ${mobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-sidebar-border">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
            <Server className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-sidebar-foreground">BISMARK ERP</div>
            <div className="text-xs text-muted-foreground">Sprint 1 — Identity</div>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMobileClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <nav className="space-y-6">
            {navGroups.map((group) => (
              <div key={group.title}>
                <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {group.title}
                </h3>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon
                    const isActive = currentView === item.view
                    return (
                      <button
                        key={item.view}
                        onClick={() => {
                          onViewChange(item.view)
                          onMobileClose()
                        }}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                          transition-colors
                          ${isActive
                            ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                          }
                        `}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="flex-1 text-right">{item.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-sidebar-accent/50">
            <Avatar className="w-9 h-9">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">مد</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">مدیر سیستم</div>
              <div className="text-xs text-muted-foreground truncate">super_admin</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

// ============================================================
// TOPBAR
// ============================================================
function Topbar({ onMenuClick, title, onViewChange, onLogout }: { onMenuClick: () => void; title: string; onViewChange: (v: View) => void; onLogout: () => void }) {
  const { theme, setTheme } = useTheme()
  const [notifOpen, setNotifOpen] = useState(false)

  return (
    <header className="h-16 border-b border-border bg-background flex items-center gap-4 px-4 lg:px-6 shrink-0">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
        <Menu className="w-5 h-5" />
      </Button>

      <div className="flex-1 min-w-0">
        <h2 className="text-lg font-semibold truncate">{title}</h2>
      </div>

      {/* Search */}
      <div className="hidden md:flex relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="جستجو... (Ctrl+K)"
          className="w-64 pr-9 bg-muted/50 border-0"
        />
      </div>

      {/* Notifications */}
      <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel>اعلان‌ها</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="flex flex-col items-start gap-1">
            <span className="text-sm font-medium">کاربر جدید ثبت شد</span>
            <span className="text-xs text-muted-foreground">۵ دقیقه پیش</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="flex flex-col items-start gap-1">
            <span className="text-sm font-medium">ورود ناموفق کاربر tech01</span>
            <span className="text-xs text-muted-foreground">۱۰ دقیقه پیش</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="flex flex-col items-start gap-1">
            <span className="text-sm font-medium">شعبه جدید اضافه شد</span>
            <span className="text-xs text-muted-foreground">۱ ساعت پیش</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Theme toggle */}
      <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
        <Sun className="w-5 h-5 dark:hidden" />
        <Moon className="w-5 h-5 hidden dark:block" />
      </Button>

      {/* Language */}
      <LanguageSwitcher />

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2 px-2">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">مد</AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline text-sm font-medium">مدیر سیستم</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>حساب کاربری</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onViewChange('profile')}>
            <UserIcon className="w-4 h-4 ml-2" />
            پروفایل من
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onViewChange('sessions')}>
            <Shield className="w-4 h-4 ml-2" />
            نشست‌های فعال
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onViewChange('inbox')}>
            <Bell className="w-4 h-4 ml-2" />
            اعلان‌ها
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onViewChange('account-settings')}>
            <Settings className="w-4 h-4 ml-2" />
            تنظیمات سیستم
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive" onClick={onLogout}>
            <LogOut className="w-4 h-4 ml-2" />
            خروج
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}

// ============================================================
// DASHBOARD VIEW
// ============================================================
function DashboardView() {
  // F-07 fix (Audit v4): fetch real stats from /api/v1/system/stats instead of mock data.
  const [liveStats, setLiveStats] = useState<{
    totalUsers: number; activeUsers: number; lockedUsers: number
    totalParties: number; totalRoles: number; totalBranches: number
  } | null>(null)

  useEffect(() => {
    apiFetch('/system/stats')
      .then((r) => r.json())
      .then((d) => setLiveStats(d.data))
      .catch(() => {
        // Fallback to mock if API fails (e.g., not authenticated yet)
        setLiveStats(dashboardStats)
      })
  }, [])

  const stats = [
    { label: 'کل کاربران', value: liveStats?.totalUsers ?? 0, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
    { label: 'کاربران فعال', value: liveStats?.activeUsers ?? 0, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/30' },
    { label: 'کاربران قفل‌شده', value: liveStats?.lockedUsers ?? 0, icon: Lock, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30' },
    { label: 'اشخاص ثبت‌شده', value: liveStats?.totalParties ?? 0, icon: UserCog, color: 'text-teal-600', bg: 'bg-teal-50 dark:bg-teal-950/30' },
    { label: 'نقش‌های سیستم', value: liveStats?.totalRoles ?? 0, icon: Shield, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
    { label: 'شعب فعال', value: liveStats?.totalBranches ?? 0, icon: Building2, color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-950/30' },
  ]

  const recentUsers = mockUsers.slice(0, 5)
  const recentParties = mockParties.slice(0, 4)

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">خوش آمدید، مدیر سیستم 👋</h1>
          <p className="text-muted-foreground mt-1">نمای کلی سیستم BISMARK ERP — Sprint 1</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 ml-2" />
            خروجی
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4 ml-2" />
            کاربر جدید
          </Button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Architecture status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-primary" />
            وضعیت معماری پروژه
          </CardTitle>
          <CardDescription>Sprint 1 — هسته سیستم و مدیریت هویت</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
              <div>
                <div className="text-sm font-medium">LAW-01: No Cross-Context JOIN</div>
                <div className="text-xs text-muted-foreground">پایگاه داده</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
              <div>
                <div className="text-sm font-medium">LAW-02: Business Codes</div>
                <div className="text-xs text-muted-foreground">کد کسب‌وکار</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
              <div>
                <div className="text-sm font-medium">LAW-03: No Cross-Context Repo</div>
                <div className="text-xs text-muted-foreground">کد</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
              <div>
                <div className="text-sm font-medium">UUID v7</div>
                <div className="text-xs text-muted-foreground">شناسه‌های time-ordered</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
              <div>
                <div className="text-sm font-medium">Multi-Tenant Ready</div>
                <div className="text-xs text-muted-foreground">Shared DB + tenant_id</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border">
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
              <div>
                <div className="text-sm font-medium">Outbox Pattern</div>
                <div className="text-xs text-muted-foreground">Event publishing</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">کاربران اخیر</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                  <Avatar className="w-9 h-9">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {user.display_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{user.display_name}</div>
                    <div className="text-xs text-muted-foreground">@{user.username}</div>
                  </div>
                  <Badge variant={statusVariants[user.status]} className="text-xs">
                    {statusLabels[user.status]}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">اشخاص اخیر</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentParties.map((party) => (
                <div key={party.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                  <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-accent-foreground text-xs font-medium">
                    {party.party_type === 'person' ? 'ح' : 'س'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{party.display_name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{party.business_code}</div>
                  </div>
                  <Badge variant={party.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                    {partyStatusLabels[party.status]}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tech stack */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            پشته فناوری
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1.5"><Zap className="w-3 h-3" /> Laravel 12</Badge>
            <Badge variant="outline" className="gap-1.5"><Zap className="w-3 h-3" /> PostgreSQL 16</Badge>
            <Badge variant="outline" className="gap-1.5"><Zap className="w-3 h-3" /> Redis</Badge>
            <Badge variant="outline" className="gap-1.5"><Zap className="w-3 h-3" /> Next.js 16</Badge>
            <Badge variant="outline" className="gap-1.5"><Zap className="w-3 h-3" /> TypeScript 5</Badge>
            <Badge variant="outline" className="gap-1.5"><Zap className="w-3 h-3" /> shadcn/ui</Badge>
            <Badge variant="outline" className="gap-1.5"><Zap className="w-3 h-3" /> Tailwind CSS 4</Badge>
            <Badge variant="outline" className="gap-1.5"><Zap className="w-3 h-3" /> Prisma ORM</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// USERS VIEW
// ============================================================
function UsersView() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const filtered = useMemo(() => {
    return mockUsers.filter((u) => {
      if (search && !u.display_name.includes(search) && !u.username.includes(search) && !u.email?.includes(search)) return false
      if (statusFilter !== 'all' && u.status !== statusFilter) return false
      if (typeFilter !== 'all' && u.user_type !== typeFilter) return false
      return true
    })
  }, [search, statusFilter, typeFilter])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">کاربران</h1>
          <p className="text-muted-foreground mt-1">{mockUsers.length} کاربر ثبت‌شده</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 ml-2" />
          کاربر جدید
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="جستجو بر اساس نام، نام کاربری یا ایمیل..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="وضعیت" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                <SelectItem value="active">فعال</SelectItem>
                <SelectItem value="suspended">معلق</SelectItem>
                <SelectItem value="locked">قفل‌شده</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="نوع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه انواع</SelectItem>
                <SelectItem value="staff">کارمند</SelectItem>
                <SelectItem value="customer">مشتری</SelectItem>
                <SelectItem value="representative">نماینده</SelectItem>
                <SelectItem value="technician">تکنسین</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">کاربر</TableHead>
                <TableHead className="text-right">نوع</TableHead>
                <TableHead className="text-right">تماس</TableHead>
                <TableHead className="text-right">وضعیت</TableHead>
                <TableHead className="text-right">آخرین ورود</TableHead>
                <TableHead className="text-center">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((user) => (
                <TableRow key={user.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedUser(user)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-9 h-9">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {user.display_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.display_name}</div>
                        <div className="text-xs text-muted-foreground">@{user.username}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{userTypeLabels[user.user_type]}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{user.email || '—'}</div>
                    <div className="text-xs text-muted-foreground">{user.phone || ''}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariants[user.status]}>{statusLabels[user.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{timeAgo(user.last_login_at)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => setSelectedUser(user)}>
                          <Edit2 className="w-4 h-4 ml-2" /> مشاهده/ویرایش
                        </DropdownMenuItem>
                        {user.status === 'active' && (
                          <DropdownMenuItem>
                            <Ban className="w-4 h-4 ml-2" /> تعلیق
                          </DropdownMenuItem>
                        )}
                        {user.status === 'suspended' && (
                          <DropdownMenuItem>
                            <CheckCircle className="w-4 h-4 ml-2" /> رفع تعلیق
                          </DropdownMenuItem>
                        )}
                        {user.status !== 'locked' && (
                          <DropdownMenuItem>
                            <Lock className="w-4 h-4 ml-2" /> قفل
                          </DropdownMenuItem>
                        )}
                        {user.status === 'locked' && (
                          <DropdownMenuItem>
                            <Unlock className="w-4 h-4 ml-2" /> رفع قفل
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="w-4 h-4 ml-2" /> حذف
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>کاربری یافت نشد</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User detail dialog */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-w-2xl">
          {selectedUser && (
            <>
              <DialogHeader>
                <DialogTitle>جزئیات کاربر</DialogTitle>
                <DialogDescription>اطلاعات کامل کاربر {selectedUser.display_name}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarFallback className="bg-primary/10 text-primary text-xl">
                      {selectedUser.display_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-xl font-semibold">{selectedUser.display_name}</div>
                    <div className="text-sm text-muted-foreground">@{selectedUser.username}</div>
                    <Badge variant={statusVariants[selectedUser.status]} className="mt-1">
                      {statusLabels[selectedUser.status]}
                    </Badge>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">نوع کاربر</Label>
                    <div className="text-sm font-medium">{userTypeLabels[selectedUser.user_type]}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">زبان</Label>
                    <div className="text-sm font-medium">{selectedUser.locale}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">ایمیل</Label>
                    <div className="text-sm font-medium flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {selectedUser.email || '—'}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">تلفن</Label>
                    <div className="text-sm font-medium flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {selectedUser.phone || '—'}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">آخرین ورود</Label>
                    <div className="text-sm font-medium flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {timeAgo(selectedUser.last_login_at)}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">تاریخ ثبت</Label>
                    <div className="text-sm font-medium">{formatDate(selectedUser.created_at)}</div>
                  </div>
                </div>
                <Separator />
                <div>
                  <Label className="text-xs text-muted-foreground">شناسه کاربر (UUID v7)</Label>
                  <div className="text-xs font-mono mt-1 p-2 rounded bg-muted break-all">{selectedUser.id}</div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline">ویرایش</Button>
                <Button onClick={() => setSelectedUser(null)}>بستن</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create user dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>ایجاد کاربر جدید</DialogTitle>
            <DialogDescription>فرم زیر را برای ایجاد کاربر جدید تکمیل کنید</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>نام کاربری *</Label>
                <Input placeholder="username" />
              </div>
              <div className="space-y-2">
                <Label>نام نمایشی *</Label>
                <Input placeholder="نام و نام خانوادگی" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ایمیل</Label>
                <Input type="email" placeholder="email@example.com" />
              </div>
              <div className="space-y-2">
                <Label>تلفن</Label>
                <Input placeholder="+98..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>نوع کاربر</Label>
                <Select defaultValue="staff">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">کارمند</SelectItem>
                    <SelectItem value="customer">مشتری</SelectItem>
                    <SelectItem value="representative">نماینده</SelectItem>
                    <SelectItem value="technician">تکنسین</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>زبان</Label>
                <Select defaultValue="fa-IR">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fa-IR">فارسی (fa-IR)</SelectItem>
                    <SelectItem value="en-US">English (en-US)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>انصراف</Button>
            <Button onClick={() => setShowCreate(false)}>ایجاد کاربر</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================
// ROLES VIEW
// ============================================================
function RolesView() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">نقش‌ها</h1>
          <p className="text-muted-foreground mt-1">{mockRoles.length} نقش تعریف‌شده</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 ml-2" />
          نقش جدید
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockRoles.map((role) => (
          <Card key={role.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{role.name}</CardTitle>
                    <div className="text-xs text-muted-foreground font-mono">{role.key}</div>
                  </div>
                </div>
                {role.is_system && <Badge variant="secondary">سیستمی</Badge>}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">{role.description}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{role.user_count || 0} کاربر</span>
                <Button variant="ghost" size="sm">مشاهده مجوزها</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// PARTIES VIEW
// ============================================================
function PartiesView() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [showCreate, setShowCreate] = useState(false)

  const filtered = useMemo(() => {
    return mockParties.filter((p) => {
      if (search && !p.display_name.includes(search) && !p.business_code.includes(search)) return false
      if (typeFilter !== 'all' && p.party_type !== typeFilter) return false
      return true
    })
  }, [search, typeFilter])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">اشخاص و سازمان‌ها</h1>
          <p className="text-muted-foreground mt-1">{mockParties.length} طرف حساب ثبت‌شده</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 ml-2" />
          شخص جدید
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="جستجو بر اساس نام یا کد کسب‌وکار..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="نوع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه انواع</SelectItem>
                <SelectItem value="person">شخص حقیقی</SelectItem>
                <SelectItem value="organization">سازمان</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">کد کسب‌وکار</TableHead>
                <TableHead className="text-right">نام</TableHead>
                <TableHead className="text-right">نوع</TableHead>
                <TableHead className="text-right">شناسه مالیاتی</TableHead>
                <TableHead className="text-right">وضعیت</TableHead>
                <TableHead className="text-right">تاریخ ثبت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((party) => (
                <TableRow key={party.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-mono text-xs">{party.business_code}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-accent-foreground text-xs font-medium">
                        {party.party_type === 'person' ? 'ح' : 'س'}
                      </div>
                      <div>
                        <div className="font-medium">{party.display_name}</div>
                        {party.organization?.legal_name_en && (
                          <div className="text-xs text-muted-foreground">{party.organization.legal_name_en}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{partyTypeLabels[party.party_type]}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{party.tax_id || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={party.status === 'active' ? 'default' : party.status === 'suspended' ? 'secondary' : 'destructive'}>
                      {partyStatusLabels[party.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(party.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <UserCog className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>شخصی یافت نشد</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>ایجاد شخص جدید</DialogTitle>
            <DialogDescription>
              کد کسب‌وکار به‌صورت خودکار تولید می‌شود (LAW-02)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>نوع شخص</Label>
              <Select defaultValue="person">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="person">شخص حقیقی</SelectItem>
                  <SelectItem value="organization">سازمان</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>نام نمایشی *</Label>
              <Input placeholder="نام کامل" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>شناسه مالیاتی</Label>
                <Input placeholder="tax_id" />
              </div>
              <div className="space-y-2">
                <Label>شماره ثبت</Label>
                <Input placeholder="registration_no" />
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              <span className="text-muted-foreground">کد کسب‌ووار تولیدی:</span>{' '}
              <span className="font-mono font-medium">PRT-1403-00006</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>انصراف</Button>
            <Button onClick={() => setShowCreate(false)}>ایجاد</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================
// BRANCHES VIEW
// ============================================================
function BranchesView() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">شعب</h1>
          <p className="text-muted-foreground mt-1">{mockBranches.length} شعبه فعال</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 ml-2" />
          شعبه جدید
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockBranches.map((branch) => (
          <Card key={branch.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{branch.name}</CardTitle>
                    <div className="text-xs text-muted-foreground font-mono">{branch.code}</div>
                  </div>
                </div>
                <Badge variant="default">فعال</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-3 h-3" /> {branch.contact_phone}
                </div>
                {branch.address && (
                  <div className="text-muted-foreground">
                    {branch.address.city}، {branch.address.street}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// AUDIT VIEW
// ============================================================
function AuditView() {
  const auditLogs = [
    { time: '۱۰:۳۰', user: 'admin', action: 'login', entity: '—', ip: '5.2.1.1' },
    { time: '۱۰:۲۸', user: 'admin', action: 'create', entity: 'User: tech01', ip: '5.2.1.1' },
    { time: '۱۰:۲۵', user: 'itadmin', action: 'update', entity: 'Role: technician', ip: '5.2.1.2' },
    { time: '۱۰:۲۰', user: 'admin', action: 'suspend', entity: 'User: rep01', ip: '5.2.1.1' },
    { time: '۱۰:۱۵', user: 'smanager', action: 'login', entity: '—', ip: '5.2.1.3' },
    { time: '۱۰:۱۰', user: 'admin', action: 'create', entity: 'Party: PRT-1403-00005', ip: '5.2.1.1' },
    { time: '۱۰:۰۵', user: 'wmanager', action: 'login', entity: '—', ip: '5.2.1.4' },
  ]

  const actionLabels: Record<string, string> = {
    login: 'ورود', logout: 'خروج', create: 'ایجاد', update: 'ویرایش',
    delete: 'حذف', suspend: 'تعلیق', lock: 'قفل', unlock: 'رفع قفل',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">لاگ ممیزی</h1>
        <p className="text-muted-foreground mt-1">ثبت تمام فعالیت‌های سیستم (append-only)</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">زمان</TableHead>
                <TableHead className="text-right">کاربر</TableHead>
                <TableHead className="text-right">عملیات</TableHead>
                <TableHead className="text-right">موجودیت</TableHead>
                <TableHead className="text-right">IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.map((log, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm font-mono">{log.time}</TableCell>
                  <TableCell className="font-medium">@{log.user}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{actionLabels[log.action] || log.action}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{log.entity}</TableCell>
                  <TableCell className="text-sm font-mono">{log.ip}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// SETTINGS VIEW
// ============================================================
function SettingsView() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">تنظیمات سیستم</h1>
        <p className="text-muted-foreground mt-1">پیکربندی سیستم BISMARK ERP</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>قوانین معماری</CardTitle>
            <CardDescription>قوانین قفل‌شده پروژه</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <div className="text-sm font-medium">LAW-01: No Cross-Context JOIN</div>
                <div className="text-xs text-muted-foreground">پایگاه داده</div>
              </div>
              <Switch defaultChecked disabled />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <div className="text-sm font-medium">LAW-02: Business Codes</div>
                <div className="text-xs text-muted-foreground">کد کسب‌وکار</div>
              </div>
              <Switch defaultChecked disabled />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <div className="text-sm font-medium">LAW-03: No Cross-Context Repo</div>
                <div className="text-xs text-muted-foreground">کد</div>
              </div>
              <Switch defaultChecked disabled />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>احراز هویت</CardTitle>
            <CardDescription>سیاست‌های امنیتی</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <div className="text-sm font-medium">حداکثر نشست همزمان</div>
                <div className="text-xs text-muted-foreground">۳ نشست</div>
              </div>
              <Badge variant="secondary">۳</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <div className="text-sm font-medium">انقضای رمز عبور</div>
                <div className="text-xs text-muted-foreground">غیرفعال (ADR-010)</div>
              </div>
              <Switch disabled />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <div className="text-sm font-medium">تأیید دو مرحله‌ای</div>
                <div className="text-xs text-muted-foreground">TOTP + SMS</div>
              </div>
              <Switch defaultChecked disabled />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ممیزی</CardTitle>
            <CardDescription>سیاست نگهداری لاگ</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <div className="text-sm font-medium">دوره آنلاین</div>
                <div className="text-xs text-muted-foreground">۱۲ ماه</div>
              </div>
              <Badge variant="secondary">۱۲</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <div className="text-sm font-medium">آرشیو</div>
                <div className="text-xs text-muted-foreground">دائمی (نامحدود)</div>
              </div>
              <Badge variant="secondary">∞</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>چندزبانه</CardTitle>
            <CardDescription>زبان‌های پشتیبانی‌شده</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <div className="text-sm font-medium">فارسی (fa-IR)</div>
                <div className="text-xs text-muted-foreground">RTL — پیش‌فرض</div>
              </div>
              <Badge>فعال</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div>
                <div className="text-sm font-medium">English (en-US)</div>
                <div className="text-xs text-muted-foreground">LTR</div>
              </div>
              <Badge variant="secondary">فعال</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ============================================================
// MAIN APP
// ============================================================
export default function Page() {
  const [authenticated, setAuthenticated] = useState(() => {
    if (typeof window !== 'undefined') {
      return isAuthenticated()
    }
    return false
  })

  const handleLogout = async () => {
    await authApi.logout()
    setAuthenticated(false)
  }
  const [view, setView] = useState<View>('dashboard')
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  if (!authenticated) {
    return <LoginScreen onLogin={() => setAuthenticated(true)} />
  }

  const viewTitles: Record<View, string> = {
    dashboard: 'داشبورد',
    users: 'کاربران',
    roles: 'نقش‌ها',
    parties: 'اشخاص و سازمان‌ها',
    products: 'مدیریت محصولات',
    inventory: 'مدیریت انبارها',
    'inventory-ledger': 'موجودی و دفتر کل',
    transfers: 'انتقالات موجودی',
    'cycle-counts': 'شمارش موجودی',
    sales: 'سفارشات فروش',
    fulfillment: 'fulfillment',
    billing: 'صورتحساب',
    returns: 'مرجوعی و بازپرداخت',
    warranty: 'گارانتی',
    service: 'خدمات و تعمیرات',
    financial: 'هسته حسابداری',
    integration: 'داشبورد یکپارچگی',
    branches: 'شعب',
    audit: 'لاگ ممیزی',
    settings: 'تنظیمات',
    'notification-dashboard': 'داشبورد اعلان‌ها',
    'notification-templates': 'الگوهای اعلان',
    notifications: 'مرکز اعلان‌ها',
    'notification-preferences': 'ترجیحات اعلان',
    profile: 'پروفایل',
    sessions: 'نشست‌های فعال',
    inbox: 'اعلان‌ها',
    'account-settings': 'تنظیمات سیستم',
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        currentView={view}
        onViewChange={setView}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onMenuClick={() => setMobileSidebarOpen(true)} title={viewTitles[view]} onViewChange={setView} onLogout={handleLogout} />

        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {view === 'dashboard' && <DashboardView />}
          {view === 'users' && <UsersView />}
          {view === 'roles' && <RolesView />}
          {view === 'parties' && <PartiesView />}
          {view === 'products' && <ProductsView />}
          {view === 'inventory' && <InventoryView />}
          {view === 'inventory-ledger' && <InventoryLedgerView />}
          {view === 'transfers' && <TransfersView />}
          {view === 'cycle-counts' && <CycleCountView />}
          {view === 'sales' && <SalesView />}
          {view === 'fulfillment' && <FulfillmentView />}
          {view === 'billing' && <BillingView />}
          {view === 'returns' && <ReturnsView />}
          {view === 'warranty' && <WarrantyView />}
          {view === 'service' && <ServiceView />}
          {view === 'financial' && <FinancialView />}
          {view === 'integration' && <IntegrationView />}
          {view === 'branches' && <BranchesView />}
          {view === 'audit' && <AuditView />}
          {view === 'settings' && <SettingsView />}
          {view === 'notification-dashboard' && <NotificationDashboardView />}
          {view === 'notification-templates' && <NotificationTemplatesView />}
          {view === 'notifications' && <NotificationsView />}
          {view === 'notification-preferences' && <NotificationPreferencesView />}
          {view === 'profile' && <ProfileView />}
          {view === 'sessions' && <SessionsView />}
          {view === 'inbox' && <NotificationsInboxView />}
          {view === 'account-settings' && <AccountSettingsView />}
        </main>

        <footer className="border-t border-border bg-background px-6 py-3 text-xs text-muted-foreground flex items-center justify-between shrink-0">
          <div>BISMARK ERP v1.0.0 — Sprint 7.3 (Notification Center)</div>
          <div className="flex items-center gap-4">
            <span>Backend: Laravel 12</span>
            <span>•</span>
            <span>Frontend: Next.js 16</span>
            <span>•</span>
            <span>DB: PostgreSQL</span>
            <span>•</span>
            <span>57 Laws</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
