export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import UpdateOrderStatus from '@/components/shared/UpdateOrderStatus'
import type { Metadata } from 'next'

interface Props { params: Promise<{ id: string }> }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  return { title: `Order #${id} — Dashboard` }
}

export default async function DashboardOrderDetail({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: order } = await supabase
    .from('orders')
    .select('*, profiles(full_name, phone, email:id), order_items(*, products(name, sku, unit))')
    .eq('id', id)
    .single()

  if (!order) notFound()

  const { data: history } = await supabase
    .from('order_status_history')
    .select('*')
    .eq('order_id', order.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Order #{order.id}</h1>
        <Badge className="capitalize text-sm">{order.status}</Badge>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Items */}
          <Card>
            <CardHeader><CardTitle className="text-base">Order Items</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left p-3">Product</th>
                    <th className="text-right p-3">Qty</th>
                    <th className="text-right p-3">Unit Price</th>
                    <th className="text-right p-3">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(order.order_items as any[])?.map((item: any) => (
                    <tr key={item.id}>
                      <td className="p-3">
                        <p className="font-medium">{item.products?.name}</p>
                        {item.products?.sku && <p className="text-xs text-muted-foreground">{item.products.sku}</p>}
                      </td>
                      <td className="p-3 text-right">{item.quantity}{item.products?.unit ? ` ${item.products.unit}` : ''}</td>
                      <td className="p-3 text-right">${item.unit_price.toFixed(2)}</td>
                      <td className="p-3 text-right font-semibold">${item.total_price.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 text-sm font-medium">
                  <tr><td colSpan={3} className="p-3 text-right">Subtotal</td><td className="p-3 text-right">${order.subtotal.toFixed(2)}</td></tr>
                  <tr><td colSpan={3} className="p-3 text-right">Tax</td><td className="p-3 text-right">${order.tax.toFixed(2)}</td></tr>
                  <tr className="font-bold"><td colSpan={3} className="p-3 text-right">Total</td><td className="p-3 text-right text-primary">${order.total.toFixed(2)}</td></tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>

          {/* Status history */}
          <Card>
            <CardHeader><CardTitle className="text-base">Status History</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {history?.map((h) => (
                <div key={h.id} className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div>
                    <p className="font-medium capitalize">{h.old_status ? `${h.old_status} → ${h.new_status}` : h.new_status}</p>
                    {h.notes && <p className="text-xs text-muted-foreground">{h.notes}</p>}
                    <p className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          {/* Update status */}
          <UpdateOrderStatus
            orderId={order.id}
            customerId={order.customer_id}
            currentStatus={order.status}
          />

          {/* Customer info */}
          <Card>
            <CardHeader><CardTitle className="text-base">Customer</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">{(order.profiles as any)?.full_name ?? 'N/A'}</p>
              {order.shipping_phone && <p className="text-muted-foreground">{order.shipping_phone}</p>}
              {order.shipping_addr && <p className="text-muted-foreground">{order.shipping_addr}</p>}
              {order.notes && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs font-medium mb-1">Notes:</p>
                  <p className="text-muted-foreground">{order.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
