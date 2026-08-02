'use client'

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Globe, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useLocale } from "next-intl"

const LANGUAGES: Array<{ code: string; label: string; nativeLabel: string; dir: "rtl" | "ltr" }> = [
  { code: "fa", label: "Persian", nativeLabel: "فارسی", dir: "rtl" },
  { code: "en", label: "English", nativeLabel: "English", dir: "ltr" },
  { code: "ku", label: "Kurdish", nativeLabel: "Kurdî", dir: "rtl" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية", dir: "rtl" },
]

/**
 * Language switcher — a dropdown that switches the active locale without a
 * hard page reload. Sets the `locale` cookie (read by `src/i18n/request.ts`),
 * updates the <html> dir/lang attributes immediately for instant feedback,
 * then calls `router.refresh()` to re-render server components with the new
 * locale's messages.
 */
export function LanguageSwitcher() {
  const router = useRouter()
  const activeLocale = useLocale()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  const switchLocale = (code: string) => {
    if (code === activeLocale) {
      setOpen(false)
      return
    }
    const lang = LANGUAGES.find((l) => l.code === code)
    if (!lang) return

    // 1. Set the cookie so the server picks up the new locale on next request
    document.cookie = `locale=${code}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`

    // 2. Update <html> dir/lang immediately (no flash of wrong direction)
    if (typeof document !== "undefined") {
      document.documentElement.lang = code
      document.documentElement.dir = lang.dir
    }

    setOpen(false)

    // 3. Soft refresh to re-render server components with new messages
    startTransition(() => {
      router.refresh()
    })
  }

  const current = LANGUAGES.find((l) => l.code === activeLocale) ?? LANGUAGES[0]

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={isPending}
          aria-label="Switch language"
          title={current.nativeLabel}
        >
          <Globe className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>زبان / Language</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => switchLocale(lang.code)}
            className="flex items-center justify-between cursor-pointer"
          >
            <span className="flex flex-col">
              <span className="text-sm font-medium">{lang.nativeLabel}</span>
              <span className="text-xs text-muted-foreground">{lang.label}</span>
            </span>
            {lang.code === activeLocale && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
