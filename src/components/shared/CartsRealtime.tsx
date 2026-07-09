'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Live-refresh the Carts page as shoppers add/change/empty their carts or move to
// checkout. carts is in the supabase_realtime publication (migration 035).
export default function CartsRealtime() {
  const router = useRouter()
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    const supabase = createClient()
    const refresh = () => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => router.refresh(), 400)
    }
    const channel = supabase
      .channel('dashboard-carts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'carts' }, refresh)
      .subscribe()
    return () => {
      if (timer.current) clearTimeout(timer.current)
      supabase.removeChannel(channel)
    }
  }, [router])

  return null
}
