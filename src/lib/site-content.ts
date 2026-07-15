// Admin-editable site content (migration 050): business hours + holidays, and
// the Privacy / Terms documents. Pure helpers usable from server and client.

export interface HoursRow { label: string; hours: string }

// A holiday is either one-time (a specific `date`) or `recurring` yearly.
// Recurring holidays are fixed-date (month + day, e.g. Dec 25) or floating
// (nth weekday of a month, e.g. 4th Thursday of November for Thanksgiving).
export interface Holiday {
  label: string
  closed: boolean
  hours?: string | null
  recurring?: boolean
  date?: string        // YYYY-MM-DD (one-time)
  month?: number       // 1-12 (recurring)
  day?: number         // 1-31 (recurring fixed-date)
  weekday?: number     // 0=Sun … 6=Sat (recurring floating)
  nth?: number         // 1..5, or -1 for "last" (recurring floating)
}

export interface BusinessHours { rows: HoursRow[]; holidays: Holiday[] }
export interface SiteContent { hours: BusinessHours; privacyHtml: string; termsHtml: string }

export const DEFAULT_HOURS: BusinessHours = {
  rows: [
    { label: 'Mon – Fri', hours: '7am – 5pm' },
    { label: 'Sat', hours: '8am – 12pm' },
    { label: 'Sun', hours: 'Closed' },
  ],
  holidays: [],
}

// Defense-in-depth sanitize for admin-authored HTML. Admins are trusted staff,
// but we still strip active content (scripts, event handlers, js: URLs) before
// rendering so a compromised admin account can't plant stored XSS.
export function sanitizeHtml(html: string): string {
  return (html || '')
    .replace(/<\/?(?:script|style|iframe|object|embed|link|meta|form|input)\b[^>]*>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/(?:href|src)\s*=\s*(?:"|')?\s*javascript:[^"'>\s]*/gi, '')
}

const pad = (n: number) => String(n).padStart(2, '0')

// Day-of-month for the nth (or last, nth=-1) `weekday` of a month/year.
function nthWeekdayDay(year: number, month: number, weekday: number, nth: number): number {
  if (nth > 0) {
    const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
    return 1 + ((weekday - firstDow + 7) % 7) + (nth - 1) * 7
  }
  const lastDate = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const lastDow = new Date(Date.UTC(year, month - 1, lastDate)).getUTCDay()
  return lastDate - ((lastDow - weekday + 7) % 7)
}

// Resolve a holiday to a concrete YYYY-MM-DD for `year` (recurring), or its
// fixed date (one-time). Returns null if under-specified.
export function resolveHolidayDate(h: Holiday, year: number): string | null {
  if (h.recurring) {
    if (h.month && h.weekday != null && h.nth != null) return `${year}-${pad(h.month)}-${pad(nthWeekdayDay(year, h.month, h.weekday, h.nth))}`
    if (h.month && h.day) return `${year}-${pad(h.month)}-${pad(h.day)}`
    return null
  }
  return h.date || null
}

// Upcoming holidays (today onward), soonest first — recurrences roll to this
// year or next as needed. Each carries its resolved date as `on`.
export function upcomingHolidays(holidays: Holiday[], todayIso: string, limit = 4): Array<Holiday & { on: string }> {
  const year = Number(todayIso.slice(0, 4))
  const out: Array<Holiday & { on: string }> = []
  for (const h of holidays) {
    if (h.recurring) {
      let on = resolveHolidayDate(h, year)
      if (on && on < todayIso) on = resolveHolidayDate(h, year + 1)
      if (on) out.push({ ...h, on })
    } else if (h.date && h.date >= todayIso) {
      out.push({ ...h, on: h.date })
    }
  }
  return out.sort((a, b) => a.on.localeCompare(b.on)).slice(0, limit)
}

// ── US federal holidays (for the "add a holiday" quick picker) ──
export interface FederalHolidayPreset { key: string; label: string; month: number; day?: number; weekday?: number; nth?: number }
export const FEDERAL_HOLIDAYS: FederalHolidayPreset[] = [
  { key: 'new-years',    label: "New Year's Day",              month: 1,  day: 1 },
  { key: 'mlk',          label: 'Martin Luther King Jr. Day',  month: 1,  weekday: 1, nth: 3 },
  { key: 'presidents',   label: "Presidents' Day",             month: 2,  weekday: 1, nth: 3 },
  { key: 'memorial',     label: 'Memorial Day',                month: 5,  weekday: 1, nth: -1 },
  { key: 'juneteenth',   label: 'Juneteenth',                  month: 6,  day: 19 },
  { key: 'independence', label: 'Independence Day',            month: 7,  day: 4 },
  { key: 'labor',        label: 'Labor Day',                   month: 9,  weekday: 1, nth: 1 },
  { key: 'columbus',     label: 'Columbus Day',                month: 10, weekday: 1, nth: 2 },
  { key: 'veterans',     label: 'Veterans Day',                month: 11, day: 11 },
  { key: 'thanksgiving', label: 'Thanksgiving Day',            month: 11, weekday: 4, nth: 4 },
  { key: 'christmas',    label: 'Christmas Day',               month: 12, day: 25 },
]

// A recurring, closed-by-default Holiday from a federal preset.
export function holidayFromPreset(p: FederalHolidayPreset): Holiday {
  return { label: p.label, closed: true, recurring: true, month: p.month, day: p.day, weekday: p.weekday, nth: p.nth }
}

// The federal holidays nearest in time from today, soonest first — so the picker
// surfaces only what's relevant now instead of the whole list. Each carries its
// next occurrence date as `on`.
export function upcomingFederalHolidays(todayIso: string, limit = 3): Array<FederalHolidayPreset & { on: string }> {
  const year = Number(todayIso.slice(0, 4))
  return FEDERAL_HOLIDAYS
    .map((p) => {
      let on = resolveHolidayDate(holidayFromPreset(p), year)!
      if (on < todayIso) on = resolveHolidayDate(holidayFromPreset(p), year + 1)!
      return { ...p, on }
    })
    .sort((a, b) => a.on.localeCompare(b.on))
    .slice(0, limit)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Reader = { from: (table: string) => any }

// Load site content via any (server or client) supabase client. Falls back to
// defaults / empty when the table or rows aren't present (e.g. pre-migration).
export async function getSiteContent(supabase: Reader): Promise<SiteContent> {
  try {
    const { data } = await supabase.from('site_content').select('key, value')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = new Map<string, any>(((data ?? []) as { key: string; value: unknown }[]).map((r) => [r.key, r.value]))
    const hv = map.get('business_hours') ?? {}
    const hours: BusinessHours = {
      rows: Array.isArray(hv.rows) && hv.rows.length ? hv.rows : DEFAULT_HOURS.rows,
      holidays: Array.isArray(hv.holidays) ? hv.holidays : [],
    }
    return {
      hours,
      privacyHtml: sanitizeHtml(map.get('privacy_policy')?.html ?? ''),
      termsHtml: sanitizeHtml(map.get('terms_of_service')?.html ?? ''),
    }
  } catch {
    return { hours: DEFAULT_HOURS, privacyHtml: '', termsHtml: '' }
  }
}
