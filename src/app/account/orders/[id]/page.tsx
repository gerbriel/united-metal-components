export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { CheckCircle, Circle, Clock } from 'lucide-react'
import type { Metadata } from 'next'
import OrderRealtimeStatus from '@/components/shared/OrderRealtimeStatus'
import LoadingChecklist from '@/components/shared/LoadingChecklist'
import { ORDER_STATUS_LABEL, ORDER_STATUS_FLOW } from '@/types/database'

interface Props { params: Promise<{ id: string }> }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  return { title: `Order #${id}` }
}

const STATUS_COLORS: Record<string, string> = {
  pending:          'bg-yellow-100 text-yellow-800 border-yellow-200',
  confirmed:        'bg-blue-100 text-blue-800 border-blue-200',
  processing:       'bg-purple-100 text-purple-800 border-purple-200',
  ready_for_pickup: 'bg-green-100 text-green-800 border-green-200',
  ready:            'bg-green-100 text-green-800 border-green-200',
  loading:          'bg-orange-100 text-orange-800 border-orange-200',
  completed:        'bg-slate-100 text-slate-800 border-slate-200',
  cancelled:        'bg-red-100 text-red-800 border-red-200',
}

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: order } = await supabase
    .from('orders')
    .select('*, order_items(*, products(name, sku, unit))')
    .eq('id', id)
    .eq('customer_id', user.id)
    .single()

  if (!order) notFound()

  const { data: history } = await supabase
    .from('order_status_history')
    .select('*')
    .eq('order_id', order.id)
    .order('created_at', { ascending: true })

  const currentStatusIdx = ORDER_STATUS_FLOW.indexOf(order.status as any)
  const showLoadingChecklist = order.status === 'loading'

  const orderItems = (order.order_items as any[]).map((i: any) => ({
    id: i.id,
    quantity: i.quantity,
    unit_price: i.unit_price,
    total_price: i.total_price,
    products: i.products,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Order #{order.id}</h1>
          <p className="text-muted-foreground text-sm">
            Placed {new Date(order.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full font-medium border capitalize ${STATUS_COLORS[order.status] ?? ''}`}>
          {ORDER_STATUS_LABEL[order.status] ?? order.status}
        </span>
      </div>

      {/* Live status tracker */}
      <Card>
        <CardHeader><CardTitle className="text-base">Order Progress</CardTitle></CardHeader>
        <CardContent>
          <OrderRealtimeStatus orderId={order.id} initialStatus={order.status} />
          {order.status !== 'cancelled' && (
            <div className="flex items-center mt-4 overflow-x-auto pb-2">
              {ORDER_STATUS_FLOW.map((s, i) => {
                const done   = i < currentStatusIdx
                const active = i === currentStatusIdx
                return (
                  <div key={s} className="flex items-center">
                    <div className="flex flex-col items-center gap-1 min-w-[80px]">
                      {done   ? <CheckCircle className="w-5 h-5 text-green-500" />
                       : active ? <Clock className="w-5 h-5 text-primary" />
                       : <Circle className="w-5 h-5 text-muted-foreground" />}
                      <span className={`text-xs text-center ${active ? 'text-primary font-medium' : done ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {ORDER_STATUS_LABEL[s]}
                      </span>
                    </div>
                    {i < ORDER_STATUS_FLOW.length - 1 && (
                      <div className={`h-0.5 w-6 mx-1 mb-4 ${i < currentStatusIdx ? 'bg-green-400' : 'bg-border'}`} />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading stage — customer side of the dual-confirmation */}
      {showLoadingChecklist && (
        <Card>
          <CardHeader><CardTitle className="text-base">Loading Confirmation — Action Required</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Your order is being loaded. Check off each item below as you confirm it has been placed in your vehicle.
            </p>
            <LoadingChecklist
              orderId={order.id}
              customerId={user.id}
              items={orderItems}
              viewerRole="customer"
              customerNoDefectsAt={order.customer_no_defects_at ?? null}
            />
          </CardContent>
        </Card>
      )}

      {/* Items */}
      <Card>
        <CardHeader><CardTitle className="text-base">Items</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {orderItems.map((item) => (
              <div key={item.id} className="flex justify-between items-center p-4">
                <div>
                  <p className="font-medium text-sm">{item.products?.name}</p>
                  {item.products?.sku && (
                    <p className="text-xs text-muted-foreground">SKU: {item.products.sku}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Qty: {item.quantity}{item.products?.unit ? ` ${item.products.unit}` : ''} × ${item.unit_price.toFixed(2)}
                  </p>
                </div>
                <span className="font-semibold">${item.total_price.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="p-4 border-t space-y-2 bg-slate-50">
            <div className="flex justify-between text-sm"><span>Subtotal</span><span>${order.subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span>Tax</span><span>${order.tax.toFixed(2)}</span></div>
            <Separator />
            <div className="flex justify-between font-bold"><span>Total</span><span>${order.total.toFixed(2)}</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Activity */}
      {history && history.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Activity</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {history.map((h) => (
              <div key={h.id} className="flex items-start gap-3 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">{ORDER_STATUS_LABEL[h.new_status] ?? h.new_status}</p>
                  {h.notes && <p className="text-muted-foreground text-xs">{h.notes}</p>}
                  <p className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {order.notes && (
        <Card>
          <CardHeader><CardTitle className="text-base">Order Notes</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">{order.notes}</p></CardContent>
        </Card>
      )}
    </div>
  )
}
