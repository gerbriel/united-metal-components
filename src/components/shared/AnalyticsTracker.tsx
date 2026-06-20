'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function getSessionId() {
  if (typeof window === 'undefined') return null
  let sid = sessionStorage.getItem('umc_sid')
  if (!sid) {
    sid = Math.random().toString(36).slice(2)
    sessionStorage.setItem('umc_sid', sid)
  }
  return sid
}

function getDevice() {
  const ua = navigator.userAgent
  if (/Mobi|Android/i.test(ua)) return 'mobile'
  if (/Tablet|iPad/i.test(ua)) return 'tablet'
  return 'desktop'
}

export default function AnalyticsTracker() {
  const pathname = usePathname()
  const supabase = createClient()
  const userRef = useRef<{ id: string | null; role: string }>({ id: null, role: 'anonymous' })

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { userRef.current = { id: null, role: 'anonymous' }; return }
      supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          userRef.current = {
            id:   user.id,
            role: (data as any)?.role ?? 'customer',
          }
        })
    })
  }, [])

  useEffect(() => {
    const { id, role } = userRef.current
    supabase.from('analytics_events').insert({
      session_id: getSessionId(),
      event:      'pageview',
      page:       pathname,
      referrer:   document.referrer || null,
      device:     getDevice(),
      user_id:    id,
      user_role:  role,
    }).then(() => {})
  }, [pathname])

  return null
}
