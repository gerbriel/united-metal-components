export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { STAFF_ROLES } from '@/types/database'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Plus, ShoppingBag } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Purchase Orders — Dashboard' }

const STATUS_COLORS: Record<string, string> = {
  draft:      'bg-slate-100 text-slate-600 border-slate-200',
  submitted:  'bg-blue-100 text-blue-700 border-blue-200',
  partial:    'bg-amber-100 text-amber-700 border-amber-200',
  received:   'bg-green-100 text-green-700 border-green-200',
  cancelled:  'bg-red-100 text-red-600 border-red-200',
}

const STATUS_LABEL: Record<string, string> = {
  draft:     'Draft',
  submitted: 'Submitted',
  partial:   'Partially Received',
  received:  'Received',
  cancelled: 'Cancelled',
}

export default async function PurchaseOrdersPage({ searchParams }: { searchParams: Promise<{ vendor?: string; status?: string }> }) {
  const { vendor, status } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = (profile as any)?.role ?? ''
  if (!STAFF_ROLES.includes(role) || role === 'warehouse_employee') redirect('/dashboard')

  let query = supabase
    .from('purchase_orders')
    .select('*, vendors(name), purchase_order_items(id)')
    .order('created_at', { ascending: false })

  if (vendor) query = query.eq('vendor_id', vendor)
  if (status) query = query.eq('status', status)

  const { data: orders } = await query

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Purchase Orders</h1>
          <p className="text-sm text-muted-foreground">Manage supplier orders for materials and hardware</p>
        </div>
        <Link
          href="/dashboard/purchase-orders/new"
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />New PO
        </Link>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'draft', 'submitted', 'partial', 'received', 'cancelled'].map((s) => (
          <Link
            key={s}
            href={s === 'all' ? '/dashboard/purchase-orders' : `/dashboard/purchase-orders?status=${s}`}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              (s === 'all' && !status) || status === s
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border hover:bg-muted text-muted-foreground'
            }`}
          >
            {s === 'all' ? 'All' : STATUS_LABEL[s]}
          </Link>
        ))}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-muted-foreground border-b">
              <tr>
                <th className="text-left p-3">PO #</th>
                <th className="text-left p-3">Vendor</th>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Expected</th>
                <th className="text-right p-3">Items</th>
                <th className="text-right p-3">Total</th>
                <th className="text-left p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {!orders?.length && (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No purchase orders yet</p>
                    <Link href="/dashboard/purchase-orders/new" className="text-sm text-primary hover:underline mt-1 inline-block">
                      Create your first PO
                    </Link>
                  </td>
                </tr>
              )}
              {orders?.map((po) => (
                <tr key={po.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3">
                    <Link href={`/dashboard/purchase-orders/${po.id}`} className="font-mono font-semibold text-primary hover:underline">
                      {po.po_number ?? po.id.slice(0, 8).toUpperCase()}
                    </Link>
                  </td>
                  <td className="p-3 font-medium">{(po as any).vendors?.name ?? '—'}</td>
                  <td className="p-3 text-muted-foreground">
                    {new Date(po.order_date).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {po.expected_date ? new Date(po.expected_date).toLocaleDateString() : '—'}
                  </td>
                  <td className="p-3 text-right text-muted-foreground">
                    {(po as any).purchase_order_items?.length ?? 0}
                  </td>
                  <td className="p-3 text-right font-semibold">
                    {po.total != null ? `$${po.total.toFixed(2)}` : '—'}
                  </td>
                  <td className="p-3">
                    <Badge className={`${STATUS_COLORS[po.status]} border text-xs`}>
                      {STATUS_LABEL[po.status] ?? po.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
