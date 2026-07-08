'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Mounted in the public layout: subscribes to catalog changes and re-fetches the
// current route's server components so admin edits (category add/rename/reorder/
// hide, product reassignment) show up live on open storefront pages — no reload.
// Debounced so a burst of changes triggers a single refresh.
export default function RealtimeRefresh() {
  const router = useRouter()
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    const supabase = createClient()
    const refresh = () => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => router.refresh(), 300)
    }
    const channel = supabase
      .channel('storefront-catalog')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_categories' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, refresh)
      .subscribe()

    return () => {
      if (timer.current) clearTimeout(timer.current)
      supabase.removeChannel(channel)
    }
  }, [router])

  return null
}
