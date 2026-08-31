/**
 * IST Date Formatting Utilities
 * All times are displayed in Indian Standard Time (UTC+5:30)
 */

const IST_LOCALE = 'en-IN'
const IST_TIMEZONE = 'Asia/Kolkata'

/**
 * Format a date as full date + time in IST
 * e.g. "1 Sep 2026, 5:00 pm"
 */
export function formatIST(date: string | Date): string {
  return new Date(date).toLocaleString('en-IN', {
    timeZone: IST_TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

/**
 * Format a date as date only in IST
 * e.g. "1 Sep 2026"
 */
export function formatDateIST(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-IN', {
    timeZone: IST_TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

/**
 * Format a date as time only in IST
 * e.g. "5:00 pm"
 */
export function formatTimeIST(date: string | Date): string {
  return new Date(date).toLocaleTimeString('en-IN', {
    timeZone: IST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

/**
 * Format a date with custom Intl.DateTimeFormatOptions, always in IST
 */
export function formatISTCustom(
  date: string | Date,
  options: Omit<Intl.DateTimeFormatOptions, 'timeZone'>
): string {
  return new Date(date).toLocaleString('en-IN', {
    ...options,
    timeZone: IST_TIMEZONE
  })
}

/**
 * Format a date range in IST
 * e.g. "1 Sep 2026, 5:00 pm – 7:00 pm"
 */
export function formatRangeIST(start: string | Date, end: string | Date): string {
  const s = new Date(start)
  const e = new Date(end)
  const sameDay =
    s.toLocaleDateString('en-IN', { timeZone: IST_TIMEZONE }) ===
    e.toLocaleDateString('en-IN', { timeZone: IST_TIMEZONE })

  if (sameDay) {
    return `${formatDateIST(s)}, ${formatTimeIST(s)} – ${formatTimeIST(e)}`
  }
  return `${formatIST(s)} – ${formatIST(e)}`
}

/**
 * Short weekday + date in IST, e.g. "Mon, 1 Sep"
 */
export function formatShortDateIST(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-IN', {
    timeZone: IST_TIMEZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  })
}
