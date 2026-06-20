export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { STAFF_ROLES, isAdminRole } from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import POActions from '@/components/shared/POActions'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Purchase Order — Dashboard' }

const STATUS_COLORS: Record<string, string> = {
  draft:      'bg-slate-100 text-slate-600 border-slate-200',
  submitted:  'bg-blue-100 text-blue-700 border-blue-200',
  partial:    'bg-amber-100 text-amber-700 border-amber-200',
  received:   'bg-green-100 text-green-700 border-green-200',
  cancelled:  'bg-red-100 text-red-600 border-red-200',
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', submitted: 'Submitted', partial: 'Partially Received',
  received: 'Received', cancelled: 'Cancelled',
}

interface Props { params: Promise<{ id: string }> }

export default async function PODetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = (profile as any)?.role ?? ''
  if (!STAFF_ROLES.includes(role) || role === 'warehouse_employee') redirect('/dashboard')
  const isAdmin = isAdminRole(role)

  const { data: po } = await supabase
    .from('purchase_orders')
    .select('*, vendors(*), purchase_order_items(*)')
    .eq('id', id)
    .single()

  if (!po) notFound()

  const { data: vendors } = await supabase.from('vendors').select('*').eq('active', true).order('name')

  const vendor = (po as any).vendors as any
  const items = ((po as any).purchase_order_items ?? []) as any[]
  const subtotal = items.reduce((s: number, i: any) => s + (i.total_cost ?? 0), 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/dashboard/purchase-orders" className="text-sm text-muted-foreground hover:text-foreground">
              Purchase Orders
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm font-mono font-semibold">
              {po.po_number ?? id.slice(0, 8).toUpperCase()}
            </span>
          </div>
          <h1 className="text-2xl font-bold">
            PO: {vendor?.name ?? 'Unknown Vendor'}
          </h1>
        </div>
        <Badge className={`${STATUS_COLORS[po.status]} border text-sm px-3 py-1`}>
          {STATUS_LABEL[po.status] ?? po.status}
        </Badge>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Line items */}
          <Card>
            <CardHeader><CardTitle className="text-base">Line Items</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs text-muted-foreground border-b">
                    <tr>
                      <th className="text-left p-3">Description</th>
                      <th className="text-right p-3">Qty</th>
                      <th className="text-left p-3">Unit</th>
                      <th className="text-right p-3">Unit Cost</th>
                      <th className="text-right p-3">Total</th>
                      <th className="text-right p-3">Received</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {items.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="p-3">
                          <p className="font-medium">{item.description ?? '—'}</p>
                          {item.notes && <p className="text-xs text-muted-foreground mt-0.5">{item.notes}</p>}
                        </td>
                        <td className="p-3 text-right">{item.quantity}</td>
                        <td className="p-3 text-muted-foreground">{item.unit ?? '—'}</td>
                        <td className="p-3 text-right">{item.unit_cost != null ? `$${Number(item.unit_cost).toFixed(2)}` : '—'}</td>
                        <td className="p-3 text-right font-semibold">{item.total_cost != null ? `$${Number(item.total_cost).toFixed(2)}` : '—'}</td>
                        <td className="p-3 text-right">
                          <span className={item.quantity_received >= item.quantity ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                            {item.quantity_received} / {item.quantity}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t bg-slate-50 font-medium">
                    <tr>
                      <td colSpan={4} className="p-3 text-right">Total</td>
                      <td className="p-3 text-right font-bold">${subtotal.toFixed(2)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {po.notes && (
            <Card>
              <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{po.notes}</p></CardContent>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Vendor info */}
          <Card>
            <CardHeader><CardTitle className="text-base">Vendor</CardTitle></CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              <p className="font-semibold">{vendor?.name ?? '—'}</p>
              {vendor?.contact_name && <p className="text-muted-foreground">{vendor.contact_name}</p>}
              {vendor?.phone && <p className="text-muted-foreground">{vendor.phone}</p>}
              {vendor?.email && <p className="text-muted-foreground">{vendor.email}</p>}
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader><CardTitle className="text-base">Dates</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order Date</span>
                <span>{new Date(po.order_date).toLocaleDateString()}</span>
              </div>
              {po.expected_date && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expected</span>
                  <span>{new Date(po.expected_date).toLocaleDateString()}</span>
                </div>
              )}
              {po.received_date && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Received</span>
                  <span className="text-green-600 font-medium">{new Date(po.received_date).toLocaleDateString()}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <POActions
            po={po as any}
            vendors={(vendors ?? []) as any}
            isAdmin={isAdmin}
          />
        </div>
      </div>
    </div>
  )
}
