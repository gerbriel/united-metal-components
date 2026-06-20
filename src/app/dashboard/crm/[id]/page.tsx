export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import AddCrmNote from '@/components/shared/AddCrmNote'
import { isAdminRole } from '@/types/database'
import type { Metadata } from 'next'

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  return { title: `Customer ${id} — CRM` }
}

export default async function CustomerDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: viewer } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  const isAdmin = isAdminRole((viewer as any)?.role ?? '')

  const [{ data: customer }, { data: orders }, { data: notes }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', id).single(),
    supabase.from('orders').select('*, order_items(id, quantity, total_price, products(id, name, sku))').eq('customer_id', id).order('created_at', { ascending: false }),
    supabase.from('crm_notes').select('*, profiles(full_name)').eq('customer_id', id).order('created_at', { ascending: false }),
  ])

  if (!customer) notFound()

  const initials = customer.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() ?? '?'
  const totalRevenue = orders?.reduce((sum, o) => sum + o.total, 0) ?? 0

  // Product purchase breakdown (all-time, admin only)
  const productMap = new Map<number, { name: string; sku: string | null; totalQty: number; totalSpent: number }>()
  if (isAdmin && orders) {
    orders.forEach((o) => {
      ;(o.order_items as any[])?.forEach((item: any) => {
        const p = item.products
        if (!p) return
        const existing = productMap.get(p.id) ?? { name: p.name, sku: p.sku, totalQty: 0, totalSpent: 0 }
        existing.totalQty += item.quantity
        existing.totalSpent += item.total_price
        productMap.set(p.id, existing)
      })
    })
  }
  const productBreakdown = Array.from(productMap.values()).sort((a, b) => b.totalQty - a.totalQty)

  const statusColors: Record<string, string> = {
    pending:          'bg-yellow-100 text-yellow-800',
    confirmed:        'bg-blue-100 text-blue-800',
    processing:       'bg-purple-100 text-purple-800',
    ready_for_pickup: 'bg-green-100 text-green-800',
    ready:            'bg-green-100 text-green-800',
    loading:          'bg-orange-100 text-orange-800',
    completed:        'bg-slate-100 text-slate-700',
    cancelled:        'bg-red-100 text-red-800',
  }

  return (
    <div className="space-y-5">
      <Link href="/dashboard/crm" className="text-sm text-muted-foreground hover:text-primary">← Back to CRM</Link>

      <div className="flex items-center gap-4">
        <Avatar className="w-14 h-14">
          <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold">{customer.full_name ?? 'Unnamed Customer'}</h1>
          <p className="text-muted-foreground text-sm">
            {(customer as any).company_name ?? ''}{customer.phone ? ` · ${customer.phone}` : ''}
          </p>
          <p className="text-xs text-muted-foreground">Customer since {new Date(customer.created_at).toLocaleDateString()}</p>
        </div>
      </div>

      <div className={`grid gap-4 ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{orders?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground">Total Orders</p>
          </CardContent>
        </Card>
        {isAdmin && (
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">${totalRevenue.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">Total Revenue</p>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{productBreakdown.length > 0 ? productBreakdown.length : '—'}</p>
            <p className="text-xs text-muted-foreground">Products Ordered</p>
          </CardContent>
        </Card>
      </div>

      <div className={`grid gap-5 ${isAdmin ? 'lg:grid-cols-2' : ''}`}>
        {/* Orders */}
        <Card>
          <CardHeader><CardTitle className="text-base">Order History</CardTitle></CardHeader>
          <CardContent className="p-0">
            {orders?.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No orders</p> : (
              <div className="divide-y">
                {orders?.map((o) => (
                  <Link key={o.id} href={`/dashboard/orders/${o.id}`}
                    className="flex items-center justify-between p-3 hover:bg-slate-50 transition-colors text-sm">
                    <div>
                      <p className="font-medium">#{o.id}</p>
                      <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isAdmin && <span>${o.total.toFixed(2)}</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${statusColors[o.status] ?? 'bg-slate-100 text-slate-700'}`}>{o.status}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {isAdmin && productBreakdown.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Products Purchased</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-muted-foreground border-b">
                  <tr>
                    <th className="text-left p-3">Product</th>
                    <th className="text-right p-3">Qty</th>
                    <th className="text-right p-3">Spent</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {productBreakdown.map((p) => (
                    <tr key={p.name} className="hover:bg-slate-50">
                      <td className="p-3">
                        <p className="font-medium">{p.name}</p>
                        {p.sku && <p className="text-xs text-muted-foreground">{p.sku}</p>}
                      </td>
                      <td className="p-3 text-right font-mono">{p.totalQty}</td>
                      <td className="p-3 text-right font-semibold text-primary">${p.totalSpent.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Notes */}
      <Card>
        <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <AddCrmNote customerId={customer.id} />
          {notes?.length === 0 ? <p className="text-sm text-muted-foreground">No notes yet</p> : (
            notes?.map((n) => (
              <div key={n.id} className="p-3 bg-slate-50 rounded-lg text-sm">
                <p>{n.body}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(n.profiles as any)?.full_name ?? 'Staff'} · {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
