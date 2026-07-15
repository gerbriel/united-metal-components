'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Announcement, AnnouncementEventType } from '@/types/database'
import {
  SLOT_FOR_FORMAT, matchesPath, matchesAudience, isSuppressed,
  recordSeen, recordDismiss, ctaHref, type AnnouncementSlot,
} from '@/lib/announcements'
import AnnouncementView from './AnnouncementView'

const SLOTS: AnnouncementSlot[] = ['top', 'modal', 'corner', 'bottom']

// modal/corner may hold back their reveal; bar/hero/bottom show as soon as they mount.
const needsDefer = (a: Announcement) =>
  (a.trigger === 'delay' && a.delay_seconds > 0) || a.trigger === 'exit'

function sessionId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    let sid = sessionStorage.getItem('umc_sid')
    if (!sid) { sid = Math.random().toString(36).slice(2); sessionStorage.setItem('umc_sid', sid) }
    return sid
  } catch { return null }
}

interface Auth { authed: boolean; userId: string | null; role: string }

export default function Announcements({ items }: { items: Announcement[] }) {
  const pathname = usePathname()
  const supabase = useMemo(() => createClient(), [])

  // Auth state gates the audience filter and stamps logged events. Resolved on
  // the client, so nothing renders during SSR / first paint (avoids mismatch).
  const [auth, setAuth] = useState<Auth | null>(null)
  useEffect(() => {
    let cancelled = false
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (cancelled) return
      if (!user) { setAuth({ authed: false, userId: null, role: 'anonymous' }); return }
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (!cancelled) setAuth({ authed: true, userId: user.id, role: (data as { role?: string } | null)?.role ?? 'customer' })
    })
    return () => { cancelled = true }
  }, [supabase])

  // The chosen promotion per slot — the highest-priority eligible match. Derived
  // (not effect state) so it only changes when the path or auth changes, never
  // from a "seen" write mid-view.
  const units = useMemo(() => {
    const chosen: Partial<Record<AnnouncementSlot, Announcement>> = {}
    if (!auth) return chosen
    const eligible = items.filter(
      (a) => matchesAudience(a, auth.authed) && matchesPath(a, pathname) && !isSuppressed(a),
    )
    for (const slot of SLOTS) {
      const best = eligible
        .filter((a) => SLOT_FOR_FORMAT[a.format] === slot)
        .sort((x, y) => (y.priority - x.priority) || (y.id - x.id))[0]
      if (best) chosen[slot] = best
    }
    return chosen
  }, [auth, items, pathname])

  const [revealed, setRevealed] = useState<Set<number>>(() => new Set())
  const [dismissed, setDismissed] = useState<Set<number>>(() => new Set())
  const loggedRef = useRef<Set<number>>(new Set())
  const reveal = useCallback((id: number) => {
    setRevealed((prev) => (prev.has(id) ? prev : new Set(prev).add(id)))
  }, [])

  // Schedule deferred reveals (delay timer / exit-intent). No synchronous
  // setState here — reveals fire from async callbacks only.
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    const cleanups: Array<() => void> = []
    for (const a of Object.values(units)) {
      if (!a || !needsDefer(a)) continue
      if (a.trigger === 'delay') {
        timers.push(setTimeout(() => reveal(a.id), a.delay_seconds * 1000))
      } else {
        const onOut = (e: MouseEvent) => { if (e.clientY <= 0) reveal(a.id) }
        document.addEventListener('mouseout', onOut)
        cleanups.push(() => document.removeEventListener('mouseout', onOut))
      }
    }
    return () => { timers.forEach(clearTimeout); cleanups.forEach((c) => c()) }
  }, [units, reveal])

  const logEvent = useCallback((a: Announcement, event: AnnouncementEventType) => {
    const info = auth ?? { userId: null, role: 'anonymous' }
    supabase.from('announcement_events').insert({
      announcement_id: a.id,
      event,
      session_id: sessionId(),
      page: pathname,
      user_id: info.userId,
      user_role: info.role,
    }).then(() => {}, () => {})
  }, [supabase, pathname, auth])

  // Log one impression the first time each unit is actually on screen.
  useEffect(() => {
    for (const a of Object.values(units)) {
      if (!a) continue
      const onScreen = !needsDefer(a) || revealed.has(a.id)
      if (!onScreen || loggedRef.current.has(a.id)) continue
      loggedRef.current.add(a.id)
      recordSeen(a)
      logEvent(a, 'impression')
    }
  }, [units, revealed, logEvent])

  const handleDismiss = useCallback((a: Announcement) => {
    recordDismiss(a)
    logEvent(a, 'dismiss')
    setDismissed((prev) => new Set(prev).add(a.id))
  }, [logEvent])

  const imageUrl = useCallback((path: string | null) => {
    if (!path) return null
    return supabase.storage.from('announcements').getPublicUrl(path).data.publicUrl
  }, [supabase])

  if (!auth) return null

  return (
    <>
      {SLOTS.map((slot) => {
        const a = units[slot]
        if (!a) return null
        const onScreen = !needsDefer(a) || revealed.has(a.id)
        if (!onScreen || dismissed.has(a.id)) return null
        return (
          <AnnouncementView
            key={a.id}
            a={a}
            imageUrl={imageUrl(a.image_path)}
            href={ctaHref(a)}
            onCta={() => logEvent(a, 'click')}
            onDismiss={() => handleDismiss(a)}
          />
        )
      })}
    </>
  )
}
