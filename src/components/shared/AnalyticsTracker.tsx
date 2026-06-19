'use client'

import { useEffect } from 'react'
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

  useEffect(() => {
    supabase.from('analytics_events').insert({
      session_id: getSessionId(),
      event: 'pageview',
      page: pathname,
      referrer: document.referrer || null,
      device: getDevice(),
    }).then(() => {})
  }, [pathname])

  return null
}
