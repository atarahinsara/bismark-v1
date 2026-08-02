'use client'

import { useCallback, useEffect, useRef, useState } from "react"
import { RefreshCw, Loader2, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/**
 * Captcha challenge returned by GET /api/v1/captcha/challenge.
 *
 *   type: 'image' → challenge.svg is an SVG string
 *   type: 'math'  → challenge.question is a math question string
 *   type: 'recaptcha' | 'turnstile' → rendered via the provider's script
 */
interface CaptchaChallenge {
  captchaId: string
  type: "image" | "math" | "recaptcha" | "turnstile"
  challenge: {
    svg?: string
    question?: string
    siteKey?: string
  }
}

interface CaptchaWidgetProps {
  /** Called whenever the captcha token changes (or becomes empty). */
  onChange: (token: string) => void
  /** Optional: disable the inputs (e.g., while submitting the form). */
  disabled?: boolean
  /**
   * If true, the widget will always render and fetch a challenge.
   * If false (default), the widget renders nothing — the parent decides
   * whether to include it. The register / forgot-password pages pass
   * `enabled` based on whether they want to show a captcha.
   */
  enabled?: boolean
}

/**
 * Internal captcha token format (image / math):
 *   "captchaId:answer"
 *
 * For recaptcha / turnstile, the token is the provider's response token.
 */
function buildInternalToken(captchaId: string, answer: string): string {
  return `${captchaId}:${answer}`
}

declare global {
  interface Window {
    grecaptcha?: {
      render: (container: HTMLElement, opts: Record<string, unknown>) => number
      getResponse: (widgetId?: number) => string
      reset: (widgetId?: number) => void
    }
    turnstile?: {
      render: (container: HTMLElement, opts: Record<string, unknown>) => string
      getResponse: (widgetId?: string) => string
      reset: (widgetId?: string) => void
    }
  }
}

const RECAPTCHA_SCRIPT = "https://www.google.com/recaptcha/api.js?render=explicit"
const TURNSTILE_SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve()
      return
    }
    const el = document.createElement("script")
    el.src = src
    el.async = true
    el.defer = true
    el.onload = () => resolve()
    el.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(el)
  })
}

/**
 * Captcha widget — supports internal image/math captcha, Google reCAPTCHA v2,
 * and Cloudflare Turnstile. The token is returned via `onChange`.
 */
export function CaptchaWidget({ onChange, disabled = false, enabled = true }: CaptchaWidgetProps) {
  const [challenge, setChallenge] = useState<CaptchaChallenge | null>(null)
  const [loading, setLoading] = useState(false)
  const [answer, setAnswer] = useState("")
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const providerWidgetId = useRef<number | string | null>(null)

  const fetchChallenge = useCallback(async () => {
    setLoading(true)
    setError(null)
    setAnswer("")
    onChange("")
    try {
      const res = await fetch("/api/v1/captcha/challenge", { cache: "no-store" })
      if (!res.ok) {
        // Captcha not configured / not required — silently hide.
        setChallenge(null)
        return
      }
      const data: CaptchaChallenge = await res.json()
      setChallenge(data)
    } catch {
      // Network error — hide widget rather than block the form.
      setChallenge(null)
    } finally {
      setLoading(false)
    }
  }, [onChange])

  useEffect(() => {
    if (!enabled) return
    fetchChallenge()
  }, [enabled, fetchChallenge])

  // --- Internal image/math captcha ---
  useEffect(() => {
    if (!challenge) return
    if (challenge.type !== "image" && challenge.type !== "math") return
    if (!answer.trim()) {
      onChange("")
      return
    }
    onChange(buildInternalToken(challenge.captchaId, answer.trim()))
  }, [answer, challenge, onChange])

  // --- reCAPTCHA rendering ---
  useEffect(() => {
    if (!challenge || challenge.type !== "recaptcha") return
    const siteKey = challenge.challenge.siteKey
    if (!siteKey || !containerRef.current) return

    let cancelled = false
    loadScript(RECAPTCHA_SCRIPT)
      .then(() => {
        if (cancelled || !window.grecaptcha || !containerRef.current) return
        providerWidgetId.current = window.grecaptcha.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token: string) => onChange(token),
          "expired-callback": () => onChange(""),
          "error-callback": () => onChange(""),
        })
      })
      .catch(() => setError("Failed to load reCAPTCHA"))
    return () => {
      cancelled = true
    }
  }, [challenge, onChange])

  // --- Turnstile rendering ---
  useEffect(() => {
    if (!challenge || challenge.type !== "turnstile") return
    const siteKey = challenge.challenge.siteKey
    if (!siteKey || !containerRef.current) return

    let cancelled = false
    loadScript(TURNSTILE_SCRIPT)
      .then(() => {
        if (cancelled || !window.turnstile || !containerRef.current) return
        providerWidgetId.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token: string) => onChange(token),
          "expired-callback": () => onChange(""),
          "error-callback": () => onChange(""),
        })
      })
      .catch(() => setError("Failed to load Turnstile"))
    return () => {
      cancelled = true
    }
  }, [challenge, onChange])

  if (!enabled) return null

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>در حال بارگذاری کپچا...</span>
      </div>
    )
  }

  if (!challenge && !error) {
    // Captcha not required — render nothing.
    return null
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive p-2">
        <ShieldCheck className="h-4 w-4" />
        <span>{error}</span>
        <Button type="button" variant="ghost" size="sm" onClick={fetchChallenge}>
          تلاش مجدد
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4" />
        تأیید انسانی
      </Label>

      {(challenge?.type === "image" || challenge?.type === "math") && (
        <div className="space-y-2">
          {challenge.type === "image" && challenge.challenge.svg ? (
            <div
              className="rounded-lg border bg-white p-2 flex items-center justify-center"
              dangerouslySetInnerHTML={{ __html: challenge.challenge.svg }}
            />
          ) : challenge.type === "math" && challenge.challenge.question ? (
            <div className="rounded-lg border bg-muted/30 p-3 text-center text-lg font-semibold">
              {challenge.challenge.question} = ؟
            </div>
          ) : null}

          <div className="flex gap-2">
            <Input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder={challenge.type === "image" ? "کاراکترهای تصویر را وارد کنید" : "جواب را وارد کنید"}
              disabled={disabled}
              className="flex-1"
              autoComplete="off"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={fetchChallenge}
              disabled={disabled || loading}
              title="تصویر جدید"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {(challenge?.type === "recaptcha" || challenge?.type === "turnstile") && (
        <div ref={containerRef} className="min-h-[78px]" />
      )}
    </div>
  )
}
