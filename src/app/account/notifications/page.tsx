export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Bell } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import NotificationList from '@/components/shared/NotificationList'
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

  if (!notifications || notifications.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No notifications yet</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Notifications</h1>
      <NotificationList userId={user.id} initialNotifications={notifications as any} />
    </div>
  )
}
