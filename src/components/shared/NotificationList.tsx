'use client'

import { useEffect, useState } from 'react'
import { Bell, Package, X } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

interface Notification {
  id: number
  type: string
  title: string
  message: string
  order_id: number | null
  read: boolean
  created_at: string
}

interface Props {
  userId: string
  initialNotifications: Notification[]
}

export default function NotificationList({ userId, initialNotifications }: Props) {
  const [items, setItems] = useState<Notification[]>(initialNotifications)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel(`notifications-list-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        async () => {
          const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
          if (data) setItems(data as Notification[])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  const dismiss = async (id: number) => {
    setItems((prev) => prev.filter((n) => n.id !== id))
    await supabase.from('notifications').delete().eq('id', id)
  }

  const clearAll = async () => {
    setItems([])
    await supabase.from('notifications').delete().eq('user_id', userId)
  }

  if (items.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground border rounded-lg bg-white">
        <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p>No notifications</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{items.length} notification{items.length !== 1 ? 's' : ''}</p>
        <Button variant="outline" size="sm" onClick={clearAll}>Clear all</Button>
      </div>

      {items.map((n) => (
        <div
          key={n.id}
          className={`flex gap-3 p-4 rounded-lg border transition-colors ${n.read ? 'bg-white border-border' : 'bg-amber-50 border-amber-200'}`}
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${n.read ? 'bg-slate-100' : 'bg-primary'}`}>
            {n.type === 'order_update'
              ? <Package className={`w-4 h-4 ${n.read ? 'text-muted-foreground' : 'text-white'}`} />
              : <Bell className={`w-4 h-4 ${n.read ? 'text-muted-foreground' : 'text-white'}`} />
            }
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-sm">{n.title}</p>
              <button
                onClick={() => dismiss(n.id)}
                title="Dismiss"
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
            <p className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
            {n.order_id && (
              <Link
                href={`/account/orders/${n.order_id}`}
                onClick={() => dismiss(n.id)}
                className="text-xs text-primary hover:underline mt-1 inline-block"
              >
                View Order #{n.order_id} →
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
