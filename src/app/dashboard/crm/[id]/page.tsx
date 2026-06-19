export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import AddCrmNote from '@/components/shared/AddCrmNote'

interface Props { params: Promise<{ id: string }> }

export default async function CustomerDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: customer }, { data: orders }, { data: notes }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', id).single(),
    supabase.from('orders').select('*, order_items(id)').eq('customer_id', id).order('created_at', { ascending: false }),
    supabase.from('crm_notes').select('*, profiles(full_name)').eq('customer_id', id).order('created_at', { ascending: false }),
  ])

  if (!customer) notFound()

  const initials = customer.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() ?? '?'
  const totalRevenue = orders?.reduce((sum, o) => sum + o.total, 0) ?? 0

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    processing: 'bg-purple-100 text-purple-800',
    ready: 'bg-green-100 text-green-800',
    completed: 'bg-slate-100 text-slate-700',
    cancelled: 'bg-red-100 text-red-800',
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
          <p className="text-muted-foreground text-sm">{customer.company ?? ''}{customer.phone ? ` · ${customer.phone}` : ''}</p>
          <p className="text-xs text-muted-foreground">Customer since {new Date(customer.created_at).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{orders?.length ?? 0}</p><p className="text-xs text-muted-foreground">Total Orders</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-primary">${totalRevenue.toFixed(0)}</p><p className="text-xs text-muted-foreground">Revenue</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold capitalize">{customer.role}</p><p className="text-xs text-muted-foreground">Role</p></CardContent></Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
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
                      <span>${o.total.toFixed(2)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${statusColors[o.status]}`}>{o.status}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <div className="space-y-3">
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
      </div>
    </div>
  )
}
