'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Monitor, Smartphone, Tablet, LogOut, Globe, Clock } from 'lucide-react'
import { toast } from 'sonner'

interface Session {
  id: string
  ipAddress: string
  browser: string
  os: string
  device: string
  issuedAt: string
  lastActivityAt: string
  expiresAt: string
}

export function SessionsView() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState<string | null>(null)

  useEffect(() => {
    fetchSessions()
  }, [])

  async function fetchSessions() {
    try {
      const token = localStorage.getItem('bismark_access_token')
      const res = await fetch('/api/v1/auth/sessions', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok) {
        setSessions(data.sessions || [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  async function revokeSession(id: string) {
    setRevoking(id)
    try {
      const token = localStorage.getItem('bismark_access_token')
      const res = await fetch(`/api/v1/auth/sessions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        toast.success('نشست باطل شد')
        fetchSessions()
      } else {
        throw new Error('خطا')
      }
    } catch {
      toast.error('خطا در باطل کردن نشست')
    } finally {
      setRevoking(null)
    }
  }

  async function revokeAll() {
    setRevoking('all')
    try {
      const token = localStorage.getItem('bismark_access_token')
      const res = await fetch('/api/v1/auth/sessions', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`${data.count} نشست دیگر باطل شد`)
        fetchSessions()
      }
    } catch {
      toast.error('خطا')
    } finally {
      setRevoking(null)
    }
  }

  function getDeviceIcon(device: string) {
    if (device === 'Mobile') return <Smartphone className="h-4 w-4" />
    if (device === 'Tablet') return <Tablet className="h-4 w-4" />
    return <Monitor className="h-4 w-4" />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            نشست‌های فعال ({sessions.length})
          </CardTitle>
          {sessions.length > 1 && (
            <Button variant="destructive" size="sm" onClick={revokeAll} disabled={revoking === 'all'}>
              {revoking === 'all' ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              خروج از همه (به‌جز این دستگاه)
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">هیچ نشست فعالی وجود ندارد</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((s, i) => (
              <div
                key={s.id}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  {getDeviceIcon(s.device)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{s.browser} روی {s.os}</span>
                    {i === 0 && <Badge variant="outline" className="text-emerald-600">این دستگاه</Badge>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> {s.ipAddress}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> آخرین فعالیت: {new Date(s.lastActivityAt).toLocaleString('fa-IR')}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    ورود: {new Date(s.issuedAt).toLocaleString('fa-IR')}
                  </div>
                </div>
                {i !== 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => revokeSession(s.id)}
                    disabled={revoking === s.id}
                  >
                    {revoking === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
