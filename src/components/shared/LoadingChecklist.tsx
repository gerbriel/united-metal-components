'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { CheckSquare, Square, Package, ShieldCheck, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface OrderItem {
  id: number
  quantity: number
  products: { name: string; sku: string | null; unit: string | null } | null
}

interface LoadingRow {
  order_item_id: number
  staff_confirmed_at: string | null
  customer_confirmed_at: string | null
}

interface Props {
  orderId: number
  customerId: string
  items: OrderItem[]
  viewerRole: 'staff' | 'customer'
  customerNoDefectsAt: string | null
}

export default function LoadingChecklist({ orderId, customerId, items, viewerRole, customerNoDefectsAt }: Props) {
  const [rows, setRows] = useState<Map<number, LoadingRow>>(new Map())
  const [busy, setBusy] = useState<Set<number>>(new Set())
  const [confirmingDefects, setConfirmingDefects] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const fetchRows = useCallback(async () => {
    const { data } = await supabase
      .from('order_item_loading')
      .select('order_item_id, staff_confirmed_at, customer_confirmed_at')
      .eq('order_id', orderId)
    if (data) {
      const m = new Map<number, LoadingRow>()
      for (const r of data) m.set(r.order_item_id, r as LoadingRow)
      setRows(m)
    }
  }, [orderId])

  useEffect(() => {
    fetchRows()

    const channel = supabase
      .channel(`loading-${orderId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_item_loading', filter: `order_id=eq.${orderId}` }, fetchRows)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [orderId, fetchRows])

  const confirmItem = async (itemId: number) => {
    setBusy((prev) => new Set(prev).add(itemId))
    const { data: { user } } = await supabase.auth.getUser()
    const existing = rows.get(itemId)

    const patch =
      viewerRole === 'staff'
        ? { staff_confirmed_at: new Date().toISOString(), staff_confirmed_by: user?.id }
        : { customer_confirmed_at: new Date().toISOString(), customer_confirmed_by: user?.id }

    const { error } = await supabase
      .from('order_item_loading')
      .upsert(
        { order_id: orderId, order_item_id: itemId, ...existing, ...patch },
        { onConflict: 'order_item_id' }
      )

    if (error) toast.error('Failed to confirm item')
    else await fetchRows()

    setBusy((prev) => { const s = new Set(prev); s.delete(itemId); return s })
  }

  const handleNoDefects = async () => {
    setConfirmingDefects(true)
    const now = new Date().toISOString()
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('orders')
      .update({ customer_no_defects_at: now, status: 'completed' })
      .eq('id', orderId)
      .eq('customer_id', customerId)

    if (error) {
      toast.error('Failed to confirm. Please try again.')
    } else {
      // Record status history
      await supabase.from('order_status_history').insert({
        order_id:   orderId,
        old_status: 'loading',
        new_status: 'completed',
        changed_by: user?.id ?? null,
        notes:      'Auto-completed: customer confirmed all items received with no defects.',
      })

      // Notify customer
      await supabase.from('notifications').insert({
        user_id:  customerId,
        type:     'order_update',
        title:    `Order #${orderId} — Completed`,
        message:  'You confirmed all items were loaded with no defects. Your order is now complete. Thank you!',
        order_id: orderId,
      })

      // Notify all staff
      await supabase.rpc('notify_all_staff', {
        p_order_id: orderId,
        p_title:    `Order #${orderId} — Completed`,
        p_message:  'Customer confirmed all items loaded with no defects. Order auto-completed.',
      })

      toast.success('Order complete! All items confirmed with no defects.')
      router.refresh()
    }
    setConfirmingDefects(false)
  }

  const allEmployeeConfirmed = items.every((i) => rows.get(i.id)?.staff_confirmed_at)
  const allCustomerConfirmed = items.every((i) => rows.get(i.id)?.customer_confirmed_at)
  const noDefectsConfirmed   = !!customerNoDefectsAt

  const canConfirmNoDefects =
    viewerRole === 'customer' && allEmployeeConfirmed && allCustomerConfirmed && !noDefectsConfirmed

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {viewerRole === 'staff'
          ? 'Check off each item as you load it into the customer\'s vehicle.'
          : 'Check off each item as you confirm it has been loaded.'}
      </p>

      <div className="border rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto] bg-slate-50 px-3 py-2 text-xs font-semibold text-muted-foreground gap-3 items-center">
          <span>Item</span>
          <span className="text-center w-24">Employee</span>
          <span className="text-center w-24">Customer</span>
        </div>
        <div className="divide-y">
          {items.map((item) => {
            const row = rows.get(item.id)
            const empDone = !!row?.staff_confirmed_at
            const custDone = !!row?.customer_confirmed_at
            const isBusy = busy.has(item.id)
            const canCheck =
              (viewerRole === 'staff' && !empDone) ||
              (viewerRole === 'customer' && empDone && !custDone)

            return (
              <div key={item.id} className="grid grid-cols-[1fr_auto_auto] px-3 py-3 gap-3 items-center">
                <div className="flex items-center gap-2 min-w-0">
                  <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.products?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      ×{item.quantity}{item.products?.unit ? ` ${item.products.unit}` : ''}
                      {item.products?.sku ? ` · ${item.products.sku}` : ''}
                    </p>
                  </div>
                </div>

                {/* Employee column */}
                <div className="w-24 flex justify-center">
                  {viewerRole === 'staff' && !empDone ? (
                    <button onClick={() => confirmItem(item.id)} disabled={isBusy} className="hover:opacity-70 transition-opacity">
                      {isBusy ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : <Square className="w-5 h-5 text-muted-foreground" />}
                    </button>
                  ) : (
                    <CheckSquare className={`w-5 h-5 ${empDone ? 'text-green-500' : 'text-slate-200'}`} />
                  )}
                </div>

                {/* Customer column */}
                <div className="w-24 flex justify-center">
                  {viewerRole === 'customer' && empDone && !custDone ? (
                    <button onClick={() => confirmItem(item.id)} disabled={isBusy} className="hover:opacity-70 transition-opacity">
                      {isBusy ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : <Square className="w-5 h-5 text-muted-foreground" />}
                    </button>
                  ) : (
                    <CheckSquare className={`w-5 h-5 ${custDone ? 'text-green-500' : 'text-slate-200'}`} />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Customer: no defects confirmation */}
      {viewerRole === 'customer' && !noDefectsConfirmed && (
        <div className={`rounded-xl border p-4 transition-opacity ${canConfirmNoDefects ? 'border-orange-300 bg-orange-50' : 'border-slate-200 bg-slate-50 opacity-60'}`}>
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-sm">Confirm no defects — all sales final</p>
              <p className="text-sm text-muted-foreground mt-1">
                By confirming, you acknowledge that all items have been loaded and you have inspected them. All sales are final — no returns or exchanges after this confirmation.
              </p>
              {!allEmployeeConfirmed && (
                <p className="text-xs text-muted-foreground mt-2 italic">Waiting for staff to finish loading…</p>
              )}
              {allEmployeeConfirmed && !allCustomerConfirmed && (
                <p className="text-xs text-muted-foreground mt-2 italic">Check off all items above first.</p>
              )}
              {canConfirmNoDefects && (
                <Button
                  onClick={handleNoDefects}
                  disabled={confirmingDefects}
                  className="mt-3 bg-orange-500 hover:bg-orange-600 text-white border-0"
                  size="sm"
                >
                  {confirmingDefects && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  I confirm — no defects, all sales final
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Customer: already confirmed */}
      {viewerRole === 'customer' && noDefectsConfirmed && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-green-600 shrink-0" />
          <div>
            <p className="font-semibold text-sm text-green-800">No-defects confirmed</p>
            <p className="text-xs text-green-700">
              Confirmed on {new Date(customerNoDefectsAt!).toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Employee: waiting for customer */}
      {viewerRole === 'staff' && allEmployeeConfirmed && !noDefectsConfirmed && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-muted-foreground">
          Waiting for customer to confirm items and accept no-defects policy.
        </div>
      )}

      {/* Employee: customer confirmed, can complete */}
      {viewerRole === 'staff' && noDefectsConfirmed && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-green-600 shrink-0" />
          <p className="text-sm font-medium text-green-800">
            Customer confirmed — ready to mark as Completed.
          </p>
        </div>
      )}
    </div>
  )
}
