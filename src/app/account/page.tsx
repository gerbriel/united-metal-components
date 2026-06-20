export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Package, Bell, ArrowRight } from 'lucide-react'

const statusColors: Record<string, string> = {
  pending:    'bg-yellow-100 text-yellow-800',
  confirmed:  'bg-blue-100 text-blue-800',
  processing: 'bg-purple-100 text-purple-800',
  ready:      'bg-green-100 text-green-800',
  completed:  'bg-slate-100 text-slate-700',
  cancelled:  'bg-red-100 text-red-800',
}

export default async function AccountDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: unreadNotifs }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('notifications').select('id', { count: 'exact' }).eq('user_id', user.id).eq('read', false),
  ])

  const isTbd = (profile as any)?.pricing_tier === 'contractor_tax_exempt_tbd'
  let ordersQuery = supabase.from('orders').select('id, status, total, created_at').eq('customer_id', user.id).order('created_at', { ascending: false }).limit(5)
  if (isTbd) ordersQuery = ordersQuery.neq('status', 'completed')
  const { data: recentOrders } = await ordersQuery

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {profile?.full_name?.split(' ')[0] ?? 'Customer'}</h1>
        <p className="text-muted-foreground text-sm mt-1">{user.email}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{recentOrders?.length ?? 0}</p>
            <p className="text-sm text-muted-foreground">Recent Orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{(unreadNotifs as any)?.length ?? 0}</p>
            <p className="text-sm text-muted-foreground">Unread Alerts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold capitalize">{profile?.role}</p>
            <p className="text-sm text-muted-foreground">Account Type</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Recent Orders</CardTitle>
          <Link href="/account/orders" className="text-sm text-primary hover:underline flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {recentOrders?.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No orders yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {recentOrders?.map((o) => (
                <Link key={o.id} href={`/account/orders/${o.id}`} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium">Order #{o.id}</p>
                    <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">${o.total.toFixed(2)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${statusColors[o.status]}`}>
                      {o.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
