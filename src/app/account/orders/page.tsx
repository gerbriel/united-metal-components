export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'My Orders' }

const statusColors: Record<string, string> = {
  pending:    'bg-yellow-100 text-yellow-800',
  confirmed:  'bg-blue-100 text-blue-800',
  processing: 'bg-purple-100 text-purple-800',
  ready:      'bg-green-100 text-green-800',
  completed:  'bg-slate-100 text-slate-700',
  cancelled:  'bg-red-100 text-red-800',
}

export default async function OrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: orders } = await supabase
    .from('orders')
    .select('*, order_items(id)')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My Orders</h1>

      {orders?.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No orders yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {orders?.map((o) => (
            <Link key={o.id} href={`/account/orders/${o.id}`}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Order #{o.id}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      {' · '}{(o.order_items as any[])?.length ?? 0} item(s)
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold">${o.total.toFixed(2)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${statusColors[o.status]}`}>
                        {o.status}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
