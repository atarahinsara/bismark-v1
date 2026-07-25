/**
 * Persian (Jalali) Calendar Helper.
 * Converts Gregorian dates to Persian (Jalali) year for business codes.
 * Uses Intl.DateTimeFormat for accurate conversion.
 */

/** Convert Gregorian date to Persian (Jalali) year */
export function persianYear(date: Date = new Date()): number {
  // Use Intl.DateTimeFormat with Persian calendar
  const parts = new Intl.DateTimeFormat('en-US-u-ca-persian', {
    year: 'numeric',
  }).formatToParts(date)

  const yearPart = parts.find((p) => p.type === 'year')
  if (yearPart) {
    return parseInt(yearPart.value, 10)
  }

  // Fallback: approximate (Persian year ≈ Gregorian year - 621 or 622)
  const gYear = date.getFullYear()
  const persianNewYear = new Date(gYear, 2, 20) // ~March 20
  return date >= persianNewYear ? gYear - 621 : gYear - 622
}

/** Format date in Persian calendar (display) */
export function formatPersianDate(date: Date): string {
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}
