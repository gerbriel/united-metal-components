// Admin-editable site content (migration 050): business hours + holidays, and
// the Privacy / Terms documents. Pure helpers usable from server and client.

export interface HoursRow { label: string; hours: string }
export interface Holiday { date: string; label: string; closed: boolean; hours?: string | null }
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

// Upcoming holidays (today onward), soonest first — for display. `todayIso` is
// passed in (YYYY-MM-DD) so callers control "now" (server vs client).
export function upcomingHolidays(holidays: Holiday[], todayIso: string, limit = 4): Holiday[] {
  return [...holidays]
    .filter((h) => h.date && h.date >= todayIso)
    .sort((a, b) => a.date.localeCompare(b.date))
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
