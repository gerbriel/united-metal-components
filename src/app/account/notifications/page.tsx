export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Bell, Package } from 'lucide-react'
import Link from 'next/link'
import MarkNotificationRead from '@/components/shared/MarkNotificationRead'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Notifications' }

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <MarkNotificationRead userId={user.id} />
      </div>

      {notifications?.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>No notifications yet</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {notifications?.map((n) => (
            <div key={n.id} className={`flex gap-3 p-4 rounded-lg border transition-colors ${n.read ? 'bg-white' : 'bg-amber-50 border-amber-200'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${n.read ? 'bg-slate-100' : 'bg-primary'}`}>
                {n.type === 'order_update'
                  ? <Package className={`w-4 h-4 ${n.read ? 'text-muted-foreground' : 'text-white'}`} />
                  : <Bell className={`w-4 h-4 ${n.read ? 'text-muted-foreground' : 'text-white'}`} />
                }
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm">{n.title}</p>
                  {!n.read && <span className="w-2 h-2 bg-primary rounded-full mt-1.5 shrink-0" />}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                <p className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
                {n.order_id && (
                  <Link href={`/account/orders/${n.order_id}`} className="text-xs text-primary hover:underline mt-1 inline-block">
                    View Order #{n.order_id} →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
