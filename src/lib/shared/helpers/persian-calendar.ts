import { db } from '@/lib/db'

/**
 * Persian (Jalali) Calendar Helper.
 * Converts Gregorian dates to Persian (Jalali) year for business codes.
 */

const PERSIAN_EPOCH = 1948320.5

/** Convert Gregorian date to Persian (Jalali) year */
export function persianYear(date: Date = new Date()): number {
  const gregorianYear = date.getFullYear()
  const gregorianMonth = date.getMonth() + 1
  const gregorianDay = date.getDate()

  // Algorithm to convert Gregorian to Jalali
  const gy = gregorianYear - 1600
  const gm = gregorianMonth - 1
  const gd = gregorianDay - 1

  let gDayNo =
    365 * gy +
    Math.floor((gy + 3) / 4) -
    Math.floor((gy + 99) / 100) +
    Math.floor((gy + 399) / 400) -
    1

  for (let i = 0; i < gm; ++i) {
    gDayNo += [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][i]
  }

  if (gm > 1 && ((gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0)) {
    gDayNo++
  }

  gDayNo += gd

  const jDayNo = gDayNo - PERSIAN_EPOCH

  const jNp = Math.floor(jDayNo / 12053)
  const remaining = jDayNo - jNp * 12053

  let jYear = 979 + 33 * jNp + Math.floor(remaining / 1461)

  return jYear
}

/** Format date in Persian calendar (display) */
export function formatPersianDate(date: Date): string {
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}
