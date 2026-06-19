export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, ShoppingBag, Users, DollarSign, TrendingUp, Clock } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardOverview() {
  const supabase = await createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [
    { count: totalOrders },
    { count: pendingOrders },
    { count: totalCustomers },
    { count: lowStock },
    { data: recentOrders },
    { data: revenueData },
  ] = await Promise.all([
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }).in('status', ['pending', 'confirmed', 'processing']),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
    supabase.from('products').select('*', { count: 'exact', head: true }).lt('stock_qty', 10).eq('active', true),
    supabase.from('orders').select('id, status, total, created_at, profiles(full_name)').order('created_at', { ascending: false }).limit(8),
    supabase.from('orders').select('total').gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
  ])

  const revenue30d = revenueData?.reduce((sum, o) => sum + o.total, 0) ?? 0

  const statusColors: Record<string, string> = {
    pending:    'text-yellow-700 bg-yellow-50',
    confirmed:  'text-blue-700 bg-blue-50',
    processing: 'text-purple-700 bg-purple-50',
    ready:      'text-green-700 bg-green-50',
    completed:  'text-slate-700 bg-slate-100',
    cancelled:  'text-red-700 bg-red-50',
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders', value: totalOrders ?? 0, icon: ShoppingBag, color: 'text-blue-600' },
          { label: 'Pending / Active', value: pendingOrders ?? 0, icon: Clock, color: 'text-amber-600' },
          { label: 'Customers', value: totalCustomers ?? 0, icon: Users, color: 'text-green-600' },
          { label: '30-Day Revenue', value: `$${revenue30d.toFixed(0)}`, icon: DollarSign, color: 'text-primary' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {lowStock && lowStock > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
          <p className="text-sm text-amber-800 font-medium">⚠️ {lowStock} products have low stock (&lt;10 units)</p>
          <Link href="/dashboard/inventory" className="text-xs text-amber-700 underline">Review inventory</Link>
        </div>
      )}

      {/* Recent orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Recent Orders</CardTitle>
          <Link href="/dashboard/orders" className="text-sm text-primary hover:underline">View all →</Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {recentOrders?.map((o) => (
              <Link key={o.id} href={`/dashboard/orders/${o.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                <div>
                  <p className="text-sm font-medium">Order #{o.id}</p>
                  <p className="text-xs text-muted-foreground">{(o.profiles as any)?.full_name ?? 'Customer'}</p>
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
        </CardContent>
      </Card>
    </div>
  )
}
