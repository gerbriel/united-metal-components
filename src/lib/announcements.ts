import type { Announcement, AnnouncementFormat } from '@/types/database'

// Which on-page "slot" each format occupies. Only one promotion renders per slot
// at a time (the highest-priority match), so formats never stack chaotically.
export type AnnouncementSlot = 'top' | 'modal' | 'corner' | 'bottom'

export const SLOT_FOR_FORMAT: Record<AnnouncementFormat, AnnouncementSlot> = {
  bar: 'top',
  hero: 'top',
  modal: 'modal',
  corner: 'corner',
  bottom: 'bottom',
}

// Normalize a path for comparison: drop the trailing slash (except root) and any
// query/hash so "/products/" and "/products" match the same rule.
function normalizePath(p: string): string {
  const path = (p.split('?')[0] ?? '').split('#')[0] ?? p
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1)
  return path || '/'
}

// A single rule matches a path. A trailing "*" is a prefix match
// ("/products/*" matches "/products" and anything under it); otherwise exact.
function ruleMatches(rule: string, pathname: string): boolean {
  const r = rule.trim()
  if (!r) return false
  const path = normalizePath(pathname)
  if (r.endsWith('*')) {
    const prefix = normalizePath(r.slice(0, -1))
    return path === prefix || path.startsWith(prefix === '/' ? '/' : prefix + '/') || path.startsWith(prefix)
  }
  return path === normalizePath(r)
}

/** True if this promotion should show on the given path, per its targeting. */
export function matchesPath(a: Announcement, pathname: string): boolean {
  if (a.target_mode === 'all') return true
  const hit = (a.target_paths ?? []).some((rule) => ruleMatches(rule, pathname))
  return a.target_mode === 'include' ? hit : !hit
}

/** True if this promotion should show for the current auth state. */
export function matchesAudience(a: Announcement, isAuthed: boolean): boolean {
  if (a.audience === 'anon') return !isAuthed
  if (a.audience === 'auth') return isAuthed
  return true
}

// ── Per-visitor frequency (localStorage / sessionStorage) ──────────────
// "always"  → shows every load; a dismiss hides it for the session
// "session" → shows once per browser session
// "daily"   → shows once per calendar day
// "once"    → shows once, ever
const KEY = (id: number) => `umc_ann_${id}`
const today = () => new Date().toISOString().slice(0, 10)

function safeGet(store: Storage | undefined, k: string): string | null {
  try { return store?.getItem(k) ?? null } catch { return null }
}
function safeSet(store: Storage | undefined, k: string, v: string): void {
  try { store?.setItem(k, v) } catch { /* private mode / disabled */ }
}

/** True if this promotion has already been seen/dismissed within its window. */
export function isSuppressed(a: Announcement): boolean {
  if (typeof window === 'undefined') return false
  const k = KEY(a.id)
  switch (a.frequency) {
    case 'once':    return safeGet(localStorage, k) === 'seen'
    case 'daily':   return safeGet(localStorage, k) === today()
    case 'session': return safeGet(sessionStorage, k) === 'seen'
    case 'always':  return safeGet(sessionStorage, `${k}_x`) === '1' // dismissed this session only
  }
}

/** Record that the promotion was shown (impression), honoring its window. */
export function recordSeen(a: Announcement): void {
  if (typeof window === 'undefined') return
  const k = KEY(a.id)
  if (a.frequency === 'once') safeSet(localStorage, k, 'seen')
  else if (a.frequency === 'daily') safeSet(localStorage, k, today())
  else if (a.frequency === 'session') safeSet(sessionStorage, k, 'seen')
}

/** Record that the visitor dismissed the promotion, honoring its window. */
export function recordDismiss(a: Announcement): void {
  if (typeof window === 'undefined') return
  const k = KEY(a.id)
  if (a.frequency === 'always') safeSet(sessionStorage, `${k}_x`, '1')
  else recordSeen(a)
}

// ── UTM ────────────────────────────────────────────────────────────────
/**
 * The CTA destination with UTM parameters appended. Returns null when there's
 * no link. UTM tags are only added when the admin set at least one of
 * source / medium / campaign (utm_content defaults to the format for context).
 */
export function ctaHref(a: Announcement): string | null {
  const url = (a.cta_url ?? '').trim()
  if (!url) return null
  const utm = a.utm ?? {}
  const hasUtm = !!(utm.source?.trim() || utm.medium?.trim() || utm.campaign?.trim())
  if (!hasUtm) return url

  const params: string[] = []
  const add = (key: string, val?: string) => {
    if (val && val.trim()) params.push(`${key}=${encodeURIComponent(val.trim())}`)
  }
  add('utm_source', utm.source)
  add('utm_medium', utm.medium)
  add('utm_campaign', utm.campaign)
  add('utm_content', utm.content?.trim() || a.format)
  add('utm_term', utm.term)

  const [beforeHash, hash] = url.split('#')
  const sep = beforeHash.includes('?') ? '&' : '?'
  return `${beforeHash}${sep}${params.join('&')}${hash ? '#' + hash : ''}`
}

// ── Live-window / status helpers (shared with the admin console) ───────
export type AnnouncementStatus = 'live' | 'scheduled' | 'ended' | 'paused'

/** Derive a status label from active flag + schedule window. `now` in ms. */
export function announcementStatus(a: Announcement, now: number): AnnouncementStatus {
  if (!a.active) return 'paused'
  if (a.starts_at && new Date(a.starts_at).getTime() > now) return 'scheduled'
  if (a.ends_at && new Date(a.ends_at).getTime() < now) return 'ended'
  return 'live'
}
