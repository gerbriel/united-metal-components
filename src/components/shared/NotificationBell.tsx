'use client'

import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Props {
  href: string
  label?: string
  className?: string
  iconClassName?: string
}

export default function NotificationBell({ href, label, className = '', iconClassName = '' }: Props) {
  const [unread, setUnread] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    let userId = ''

    const fetchCount = async (uid: string) => {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', uid)
        .eq('read', false)
      setUnread(count ?? 0)
    }

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      userId = user.id
      await fetchCount(userId)

      supabase
        .channel(`notifs-${userId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
          () => fetchCount(userId!)
        )
        .subscribe()
    }

    init()
    return () => { supabase.removeAllChannels() }
  }, [])

  return (
    <Link href={href} className={`flex items-center gap-3 ${className}`}>
      <span className="relative inline-flex shrink-0">
        <Bell className={iconClassName || 'w-4 h-4'} />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 bg-orange-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </span>
      {label && <span>{label}</span>}
    </Link>
  )
}
