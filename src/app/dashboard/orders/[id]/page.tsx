export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import UpdateOrderStatus from '@/components/shared/UpdateOrderStatus'
import StagingChecklist from '@/components/shared/StagingChecklist'
import LoadingChecklist from '@/components/shared/LoadingChecklist'
import { ORDER_STATUS_LABEL } from '@/types/database'
import type { EmployeeRole } from '@/types/database'
import type { Metadata } from 'next'

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  return { title: `Order #${id} — Dashboard` }
}

const STATUS_COLORS: Record<string, string> = {
  pending:          'text-yellow-700 bg-yellow-50 border-yellow-200',
  confirmed:        'text-blue-700 bg-blue-50 border-blue-200',
  processing:       'text-purple-700 bg-purple-50 border-purple-200',
  ready_for_pickup: 'text-green-700 bg-green-50 border-green-200',
  ready:            'text-green-700 bg-green-50 border-green-200',
  loading:          'text-orange-700 bg-orange-50 border-orange-200',
  completed:        'text-slate-700 bg-slate-100 border-slate-200',
  cancelled:        'text-red-700 bg-red-50 border-red-200',
}

export default async function DashboardOrderDetail({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: viewer } = await supabase
    .from('profiles')
    .select('role, employee_role')
    .eq('id', user!.id)
    .single()

  const empRole = (viewer as any)?.employee_role as EmployeeRole | null
  const isWarehouse = empRole === 'warehouse' && (viewer as any)?.role !== 'admin'

  const { data: order } = await supabase
    .from('orders')
    .select('*, profiles(first_name, last_name, full_name, phone, company_name, mailing_address, business_address), order_items(*, products(name, sku, unit, description))')
    .eq('id', id)
    .single()

  if (!order) notFound()

  const { data: history } = await supabase
    .from('order_status_history')
    .select('*')
    .eq('order_id', order.id)
    .order('created_at', { ascending: false })

  // Staging: fetch which items are staged
  const { data: stagingRows } = await supabase
    .from('order_item_staging')
    .select('order_item_id')
    .eq('order_id', order.id)

  const stagedIds = new Set((stagingRows ?? []).map((r) => r.order_item_id))
  const allItemsStaged =
    (order.order_items as any[]).length > 0 &&
    (order.order_items as any[]).every((i: any) => stagedIds.has(i.id))

  const orderItems = (order.order_items as any[]).map((i: any) => ({
    id: i.id,
    quantity: i.quantity,
    unit_price: i.unit_price,
    total_price: i.total_price,
    products: i.products,
  }))

  const customer = order.profiles as any
  const customerName = customer?.first_name && customer?.last_name
    ? `${customer.first_name} ${customer.last_name}`
    : customer?.full_name ?? 'Unknown'

  const showStaging = order.status === 'processing'
  const showLoading  = order.status === 'loading'

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Order #{order.id}</h1>
        <span className={`text-xs px-3 py-1 rounded-full font-medium border ${STATUS_COLORS[order.status] ?? ''}`}>
          {ORDER_STATUS_LABEL[order.status] ?? order.status}
        </span>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">

          {/* Order Items */}
          <Card>
            <CardHeader><CardTitle className="text-base">Order Items</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left p-3">Product</th>
                    <th className="text-right p-3">Qty</th>
                    {!isWarehouse && <th className="text-right p-3">Unit Price</th>}
                    {!isWarehouse && <th className="text-right p-3">Total</th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {orderItems.map((item) => (
                    <tr key={item.id}>
                      <td className="p-3">
                        <p className="font-medium">{item.products?.name}</p>
                        {item.products?.sku && (
                          <p className="text-xs text-muted-foreground">SKU: {item.products.sku}</p>
                        )}
                        {item.products?.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 max-w-xs truncate">{item.products.description}</p>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {item.quantity}{item.products?.unit ? ` ${item.products.unit}` : ''}
                      </td>
                      {!isWarehouse && (
                        <td className="p-3 text-right">${item.unit_price.toFixed(2)}</td>
                      )}
                      {!isWarehouse && (
                        <td className="p-3 text-right font-semibold">${item.total_price.toFixed(2)}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
                {!isWarehouse && (
                  <tfoot className="bg-slate-50 text-sm font-medium">
                    <tr><td colSpan={3} className="p-3 text-right">Subtotal</td><td className="p-3 text-right">${order.subtotal.toFixed(2)}</td></tr>
                    <tr><td colSpan={3} className="p-3 text-right">Tax</td><td className="p-3 text-right">${order.tax.toFixed(2)}</td></tr>
                    <tr className="font-bold"><td colSpan={3} className="p-3 text-right">Total</td><td className="p-3 text-right text-primary">${order.total.toFixed(2)}</td></tr>
                  </tfoot>
                )}
              </table>
            </CardContent>
          </Card>

          {/* Staging Checklist — shown during processing */}
          {showStaging && (
            <Card>
              <CardHeader><CardTitle className="text-base">Staging Checklist</CardTitle></CardHeader>
              <CardContent>
                <StagingChecklist
                  orderId={order.id}
                  items={orderItems}
                />
              </CardContent>
            </Card>
          )}

          {/* Loading Checklist — shown during loading */}
          {showLoading && (
            <Card>
              <CardHeader><CardTitle className="text-base">Loading Confirmation</CardTitle></CardHeader>
              <CardContent>
                <LoadingChecklist
                  orderId={order.id}
                  customerId={order.customer_id}
                  items={orderItems}
                  viewerRole="employee"
                  customerNoDefectsAt={order.customer_no_defects_at ?? null}
                />
              </CardContent>
            </Card>
          )}

          {/* Status History */}
          <Card>
            <CardHeader><CardTitle className="text-base">Status History</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {history?.map((h) => (
                <div key={h.id} className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div>
                    <p className="font-medium">
                      {h.old_status
                        ? `${ORDER_STATUS_LABEL[h.old_status] ?? h.old_status} → ${ORDER_STATUS_LABEL[h.new_status] ?? h.new_status}`
                        : (ORDER_STATUS_LABEL[h.new_status] ?? h.new_status)}
                    </p>
                    {h.notes && <p className="text-xs text-muted-foreground">{h.notes}</p>}
                    <p className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

        </div>

        {/* Right column */}
        <div className="space-y-5">

          {/* Update Status — only for office/admin */}
          {!isWarehouse && (
            <UpdateOrderStatus
              orderId={order.id}
              customerId={order.customer_id}
              currentStatus={order.status as any}
              allItemsStaged={allItemsStaged}
              customerNoDefectsAt={order.customer_no_defects_at ?? null}
            />
          )}

          {/* Customer info */}
          <Card>
            <CardHeader><CardTitle className="text-base">Customer</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">{customerName}</p>
              {customer?.company_name && (
                <p className="text-muted-foreground">{customer.company_name}</p>
              )}
              {order.shipping_phone && (
                <p className="text-muted-foreground">{order.shipping_phone}</p>
              )}
              {!isWarehouse && customer?.business_address && (
                <div className="mt-2 pt-2 border-t">
                  <p className="text-xs font-medium mb-1">Business Address</p>
                  <p className="text-muted-foreground">{customer.business_address}</p>
                </div>
              )}
              {!isWarehouse && customer?.mailing_address && (
                <div className="mt-2">
                  <p className="text-xs font-medium mb-1">Mailing Address</p>
                  <p className="text-muted-foreground">{customer.mailing_address}</p>
                </div>
              )}
              {order.notes && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs font-medium mb-1">Order Notes</p>
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
