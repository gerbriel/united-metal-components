export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import UpdateOrderStatus from '@/components/shared/UpdateOrderStatus'
import StagingChecklist from '@/components/shared/StagingChecklist'
import LoadingChecklist from '@/components/shared/LoadingChecklist'
import SpecialOrderETA from '@/components/shared/SpecialOrderETA'
import { ORDER_STATUS_LABEL, isWarehouseRole, isAdminRole } from '@/types/database'
import OrderAdminActions from '@/components/shared/OrderAdminActions'
import OrderPriceEditor, { type EditorItem } from '@/components/shared/OrderPriceEditor'
import { fetchTaxRates } from '@/lib/tax'
import { buildFinishPriceMap, type FinishPriceMap, type TierPriceMap } from '@/lib/finishes'
import OverstockImport from '@/components/shared/OverstockImport'
import { orderQtyParts } from '@/lib/orderUnits'
import OrderCoilAvailability from '@/components/shared/OrderCoilAvailability'
import OrderTrimAvailability, { type TrimCheckDisplay, type UncheckedTrimLine } from '@/components/shared/OrderTrimAvailability'
import { orderColorAvailability, orderTrimAvailability, openPoCoilFlags, OPEN_ORDER_STATUSES, PO_OPEN_STATUSES, type OrderColorCheck } from '@/lib/coilSupply'
import { COLORS, isTrimSku } from '@/lib/product-config'
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

  const isWarehouse = isWarehouseRole((viewer as any)?.role)
  const isAdmin     = isAdminRole((viewer as any)?.role ?? '')

  const { data: order } = await supabase
    .from('orders')
    .select('*, profiles(first_name, last_name, full_name, phone, company_name, mailing_address, business_address, pricing_tier), order_items(*, products(name, sku, unit, description, price, price_metric))')
    .eq('id', id)
    .single()

  if (!order) notFound()

  // Panel coil + trim availability — only for open orders, and hidden from
  // warehouse staff (purchasing/material-planning concern). Panels check coil
  // footage by color; trim checks trim_stock piece counts by (product, finish)
  // since trim lines carry no linear footage (migration 058).
  let coilChecks: OrderColorCheck[] = []
  let colorsOnOrder: string[] = []
  let trimChecks: TrimCheckDisplay[] = []
  let uncheckedTrim: UncheckedTrimLine[] = []
  if (!isWarehouse && (OPEN_ORDER_STATUSES as readonly string[]).includes(order.status)) {
    const [{ data: panelCoils }, { data: openDemand }, { data: poLines }, { data: openPieceDemand }, { data: trimStock }, { data: finishRows }] = await Promise.all([
      supabase
        .from('product_coils')
        .select('color, lbs_per_linear_foot, initial_weight_lbs, current_weight_lbs, status, archived')
        .eq('coil_category', 'panel'),
      supabase
        .from('order_items')
        .select('order_id, item_color, linear_feet, orders!inner(status)')
        .not('item_color', 'is', null)
        .not('linear_feet', 'is', null)
        .in('orders.status', OPEN_ORDER_STATUSES as unknown as string[]),
      // Open PO lines still awaiting receipt, for the "already on order" flag.
      supabase
        .from('purchase_order_items')
        .select('description, notes, quantity, quantity_received, products(coil_category), purchase_orders!inner(status)')
        .in('purchase_orders.status', PO_OPEN_STATUSES as unknown as string[]),
      // Finished piece lines (no footage) across open orders — trim demand is
      // the subset whose product SKU is a trim SKU, filtered below. finish_id
      // is NOT filtered here: legacy/OrderBuilder lines can lack one, and those
      // must surface as "unchecked" rather than silently pass.
      supabase
        .from('order_items')
        .select('order_id, product_id, finish_id, quantity, item_color, products(name, sku), orders!inner(status)')
        .is('linear_feet', null)
        .in('orders.status', OPEN_ORDER_STATUSES as unknown as string[]),
      supabase.from('trim_stock').select('product_id, finish_id, qty'),
      supabase.from('finishes').select('id, name, hex, gradient, texture'),
    ])
    coilChecks = orderColorAvailability((panelCoils ?? []) as any, (openDemand ?? []) as any, order.id)
    const flags = openPoCoilFlags(
      ((poLines ?? []) as any[]).map((l) => ({
        status: l.purchase_orders?.status ?? '',
        description: l.description,
        notes: l.notes,
        quantity: l.quantity,
        quantity_received: l.quantity_received,
        coil_category: l.products?.coil_category ?? null,
      })),
      COLORS.map((c) => c.name),
    )
    colorsOnOrder = [...flags.panelColorsOnOrder]

    const trimDemand = ((openPieceDemand ?? []) as any[]).filter((d) => isTrimSku(d.products?.sku))
    const trimNames = new Map<number, string>(trimDemand.map((d) => [d.product_id as number, d.products?.name ?? 'Trim']))
    const finishById = new Map<number, any>(((finishRows ?? []) as any[]).map((f) => [f.id as number, f]))
    trimChecks = orderTrimAvailability((trimStock ?? []) as any, trimDemand as any, order.id).map((c) => {
      const f = finishById.get(c.finishId)
      return {
        ...c,
        productName: trimNames.get(c.productId) ?? 'Trim',
        finishName: f?.name ?? 'Unknown finish',
        finishHex: f?.hex ?? null,
        finishGradient: f?.gradient ?? null,
        finishTexture: f?.texture ?? null,
      }
    })
    // This order's trim lines with no finish stamped can't be checked against
    // stock — show them as needing attention instead of silently passing.
    uncheckedTrim = trimDemand
      .filter((d) => d.order_id === order.id && d.finish_id == null)
      .map((d) => ({
        productName: d.products?.name ?? 'Trim',
        itemColor: d.item_color ?? null,
        pieces: Number(d.quantity),
      }))
  }

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
    notes: i.notes ?? null,
    item_color: i.item_color ?? null,
    is_special_order: !!i.is_special_order,
    estimated_arrival_date: i.estimated_arrival_date ?? null,
    length_feet: i.length_feet ?? null,
    linear_feet: i.linear_feet ?? null,
  }))

  const specialItems = orderItems.filter((i) => i.is_special_order)

  // Admins can correct line prices only while the order is still pending — the
  // window before it is accepted. This is how a price that drifted after the
  // order was placed gets fixed. The editor previews tax per the customer's tier
  // + admin-set rates, matching the recompute_order_totals trigger.
  const customerTier = (order.profiles as any)?.pricing_tier ?? null
  const taxRates = await fetchTaxRates(supabase)
  const canEditPrices = isAdmin && !isWarehouse && order.status === 'pending'

  // Finish- and tier-aware reference pricing for the editor (admin, pending only):
  // fetch the base-tier (contractor/retail) and per-finish-class overrides for just
  // the products on this order, mirroring the new-order builder's loader so the
  // "expected" unit price accounts for finish class + tier basis (per-foot length
  // is applied per line in OrderPriceEditor).
  const tierPrices: TierPriceMap = {}
  let finishPrices: FinishPriceMap = {}
  if (canEditPrices) {
    const productIds = [
      ...new Set(
        (order.order_items as { product_id: number | null }[])
          .map((i) => i.product_id)
          .filter((v): v is number => v != null),
      ),
    ]
    if (productIds.length) {
      const [{ data: tierRows }, { data: finishRows }] = await Promise.all([
        supabase
          .from('product_tier_prices')
          .select('product_id, tier_key, price')
          .in('product_id', productIds)
          .in('tier_key', ['contractor', 'retail']),
        supabase
          .from('product_finish_prices')
          .select('product_id, tier_key, finish_class, price')
          .in('product_id', productIds)
          .in('tier_key', ['contractor', 'retail']),
      ])
      for (const r of (tierRows ?? []) as { product_id: number; tier_key: string; price: number | string }[]) {
        const e = (tierPrices[r.product_id] ??= {})
        if (r.tier_key === 'contractor') e.contractor = Number(r.price)
        else if (r.tier_key === 'retail') e.retail = Number(r.price)
      }
      finishPrices = buildFinishPriceMap(finishRows as never)
    }
  }

  const editorItems: EditorItem[] = (order.order_items as any[]).map((i: any) => ({
    id: i.id,
    name: i.products?.name ?? 'Unknown product',
    sku: i.products?.sku ?? null,
    unit: i.products?.unit ?? null,
    quantity: i.quantity,
    unit_price: Number(i.unit_price),
    total_price: Number(i.total_price),
    length_feet: i.length_feet ?? null,
    linear_feet: i.linear_feet ?? null,
    product_id: i.product_id,
    product_price: i.products?.price != null ? Number(i.products.price) : null,
    price_metric: i.products?.price_metric ?? 'per_piece',
    item_color: i.item_color ?? null,
    is_overstock: i.panel_overstock_id != null,
    detail: i.notes ?? null,
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

          {coilChecks.length > 0 && <OrderCoilAvailability checks={coilChecks} colorsOnOrder={colorsOnOrder} />}
          {(trimChecks.length > 0 || uncheckedTrim.length > 0) && (
            <OrderTrimAvailability checks={trimChecks} unchecked={uncheckedTrim} />
          )}

          {/* Order Items */}
          <Card>
            <CardHeader><CardTitle className="text-base">Order Items</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left p-3">Product</th>
                    <th className="text-right p-3">Pieces</th>
                    <th className="text-right p-3">Linear Ft</th>
                    {!isWarehouse && <th className="text-right p-3">Unit Price</th>}
                    {!isWarehouse && <th className="text-right p-3">Total</th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {orderItems.map((item) => (
                    <tr key={item.id}>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-medium">{item.products?.name}</p>
                          {item.is_special_order && (
                            <span className="text-[10px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                              Special Order
                            </span>
                          )}
                        </div>
                        {item.products?.sku && (
                          <p className="text-xs text-muted-foreground">SKU: {item.products.sku}</p>
                        )}
                        {item.notes && (
                          <p className="text-xs text-muted-foreground mt-0.5">{item.notes}</p>
                        )}
                        {item.estimated_arrival_date && (
                          <p className="text-xs text-amber-700 mt-0.5">ETA: {new Date(item.estimated_arrival_date).toLocaleDateString()}</p>
                        )}
                      </td>
                      {(() => {
                        const { pieces, linearFeet } = orderQtyParts({
                          quantity: item.quantity,
                          unit: item.products?.unit,
                          lengthFeet: item.length_feet,
                          linearFeet: item.linear_feet,
                        })
                        return (
                          <>
                            <td className="p-3 text-right">{pieces}</td>
                            <td className="p-3 text-right">{linearFeet ?? <span className="text-muted-foreground">—</span>}</td>
                          </>
                        )
                      })()}
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
                    <tr><td colSpan={4} className="p-3 text-right">Subtotal</td><td className="p-3 text-right">${order.subtotal.toFixed(2)}</td></tr>
                    <tr><td colSpan={4} className="p-3 text-right">Tax</td><td className="p-3 text-right">${order.tax.toFixed(2)}</td></tr>
                    <tr className="font-bold"><td colSpan={4} className="p-3 text-right">Total</td><td className="p-3 text-right text-primary">${order.total.toFixed(2)}</td></tr>
                  </tfoot>
                )}
              </table>
            </CardContent>
          </Card>

          {/* Adjust pricing — admin only, before the order enters fulfillment */}
          {canEditPrices && (
            <Card>
              <CardHeader><CardTitle className="text-base">Adjust Pricing</CardTitle></CardHeader>
              <CardContent>
                <OrderPriceEditor
                  orderId={order.id}
                  items={editorItems}
                  tier={customerTier}
                  rates={taxRates}
                  storedTotal={order.total}
                  finishPrices={finishPrices}
                  tierPrices={tierPrices}
                />
              </CardContent>
            </Card>
          )}

          {/* Special Order ETA — shown when there are special order items */}
          {specialItems.length > 0 && !isWarehouse && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-amber-700">Special Order Items — Set Estimated Arrival</CardTitle>
              </CardHeader>
              <CardContent>
                <SpecialOrderETA
                  orderId={order.id}
                  items={specialItems.map((i) => ({
                    id: i.id,
                    product_name: i.products?.name ?? 'Unknown',
                    quantity: i.quantity,
                    estimated_arrival_date: i.estimated_arrival_date,
                  }))}
                />
              </CardContent>
            </Card>
          )}

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
                  viewerRole="staff"
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

          {/* Update Status — office/admin get full control; warehouse gets limited workflow */}
          <UpdateOrderStatus
            orderId={order.id}
            customerId={order.customer_id}
            currentStatus={order.status as any}
            allItemsStaged={allItemsStaged}
            customerNoDefectsAt={order.customer_no_defects_at ?? null}
            warehouseMode={isWarehouse}
          />

          {isAdmin && (
            <OrderAdminActions orderId={order.id} archived={order.archived ?? false} />
          )}

          {/* Canceled orders: send their already-cut panels to overstock inventory */}
          {order.status === 'cancelled' && !isWarehouse && (
            <Card>
              <CardHeader><CardTitle className="text-base">Overstock</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  This order was canceled — send its panels to overstock inventory to re-sell them.
                </p>
                <OverstockImport
                  orderId={order.id}
                  triggerClassName="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/80 transition-colors"
                />
              </CardContent>
            </Card>
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
