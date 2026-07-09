'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Loader2, PackageOpen, AlertTriangle } from 'lucide-react'
import { COLORS, PANEL_SKUS, OVERSTOCK_SKUS, isOverstockSku } from '@/lib/product-config'

// Turn a canceled order's panel lines into overstock listings. Two entry points
// share this dialog: the order detail page passes `orderId` (straight to review),
// the Overstock tab passes nothing (pick a canceled order first). Coils are
// traceability-only (carried onto the listing); no coil stock is changed.

interface CancelledOrder { id: number; created_at: string; shipping_name: string | null; total: number | null }

interface Row {
  key: string
  include: boolean
  color: string       // '' = no color / bare
  ft: string
  inch: string
  qty: string
  price: string       // resale $/pc, staff-set
  coilId: number | null
}

// A panel line is either the regular cut panel or the overstock product itself.
const isPanelLine = (sku?: string | null) => !!sku && (PANEL_SKUS.has(sku) || isOverstockSku(sku))

interface Props {
  orderId?: number             // set → skip the picker, review this order
  overstockProductId?: number | null
  triggerLabel?: string
  triggerClassName?: string
  onImported?: () => void
}

export default function OverstockImport({
  orderId,
  overstockProductId,
  triggerLabel = 'Send panels to overstock',
  triggerClassName,
  onImported,
}: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'pick' | 'review'>(orderId ? 'review' : 'pick')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [productId, setProductId] = useState<number | null>(overstockProductId ?? null)
  const [orders, setOrders] = useState<CancelledOrder[]>([])
  const [importedOrderIds, setImportedOrderIds] = useState<Set<number>>(new Set())
  const [activeOrderId, setActiveOrderId] = useState<number | null>(orderId ?? null)
  const [rows, setRows] = useState<Row[]>([])
  const [alreadyImported, setAlreadyImported] = useState(false)

  const resolveProduct = async (): Promise<number | null> => {
    if (productId) return productId
    const { data } = await supabase
      .from('products')
      .select('id, sku')
      .or([...OVERSTOCK_SKUS].map((s) => `sku.ilike.${s}`).join(','))
      .limit(1)
    const id = (data?.[0] as { id: number } | undefined)?.id ?? null
    setProductId(id)
    return id
  }

  const loadOrders = async () => {
    const [{ data: ords }, { data: imported }] = await Promise.all([
      supabase
        .from('orders')
        .select('id, created_at, shipping_name, total')
        .eq('status', 'cancelled')
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('panel_overstock').select('source_order_id').not('source_order_id', 'is', null),
    ])
    setOrders((ords ?? []) as CancelledOrder[])
    setImportedOrderIds(new Set((imported ?? []).map((r: { source_order_id: number }) => Number(r.source_order_id))))
  }

  const loadLines = async (oid: number) => {
    const { data } = await supabase
      .from('order_items')
      .select('id, quantity, unit_price, item_color, length_feet, linear_feet, coil_id, products(sku)')
      .eq('order_id', oid)
    const rs: Row[] = ((data ?? []) as any[])
      .filter((l) => isPanelLine(l.products?.sku))
      .map((l) => {
        const qty = Number(l.quantity) || 0
        const li = l.linear_feet != null ? Number(l.linear_feet) : null
        // Recover feet + inches from total linear feet when possible (checkout only
        // stores whole length_feet + the total linear_feet).
        const per = li != null && qty ? li / qty : l.length_feet != null ? Number(l.length_feet) : 0
        let ft = Math.floor(per)
        let inch = Math.round((per - ft) * 12)
        if (inch >= 12) { ft += 1; inch = 0 }
        return {
          key: String(l.id),
          include: true,
          color: l.item_color ?? '',
          ft: ft ? String(ft) : l.length_feet != null ? String(l.length_feet) : '',
          inch: String(inch),
          qty: String(qty),
          price: l.unit_price != null ? String(l.unit_price) : '',
          coilId: l.coil_id != null ? Number(l.coil_id) : null,
        }
      })
    setRows(rs)
    const { data: existing } = await supabase.from('panel_overstock').select('id').eq('source_order_id', oid).limit(1)
    setAlreadyImported((existing?.length ?? 0) > 0)
  }

  const handleOpenChange = async (o: boolean) => {
    setOpen(o)
    if (!o) return
    setLoading(true)
    const pid = await resolveProduct()
    if (orderId) {
      setActiveOrderId(orderId)
      setStep('review')
      await loadLines(orderId)
    } else {
      setStep('pick')
      await loadOrders()
    }
    setLoading(false)
    if (!pid) toast.error('No overstock product configured — create it in Products first')
  }

  const pickOrder = async (oid: number) => {
    setActiveOrderId(oid)
    setStep('review')
    setLoading(true)
    await loadLines(oid)
    setLoading(false)
  }

  const setRow = (key: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))

  const included = rows.filter(
    (r) => r.include && ((parseInt(r.ft) || 0) > 0 || (parseInt(r.inch) || 0) > 0) && (parseInt(r.qty) || 0) > 0,
  )

  const handleImport = async () => {
    const pid = productId ?? (await resolveProduct())
    if (!pid) { toast.error('No overstock product configured'); return }
    if (included.length === 0) { toast.error('Select at least one line with a length and quantity'); return }
    setSaving(true)
    const payload = included.map((r) => ({
      product_id: pid,
      color: r.color || null,
      length_ft: parseInt(r.ft) || 0,
      length_in: parseInt(r.inch) || 0,
      quantity: parseInt(r.qty),
      unit_price: r.price ? parseFloat(r.price) : null,
      coil_id: r.coilId,
      source_order_id: activeOrderId,
      notes: `Imported from canceled order #${activeOrderId}`,
    }))
    const { error } = await supabase.from('panel_overstock').insert(payload)
    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success(`Added ${payload.length} overstock listing${payload.length === 1 ? '' : 's'}`)
    setSaving(false)
    setOpen(false)
    onImported?.()
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={
        <button className={triggerClassName ?? 'inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors'}>
          <PackageOpen className="w-4 h-4" />{triggerLabel}
        </button>
      } />
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Send panels to overstock</DialogTitle></DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />Loading…
          </div>
        ) : step === 'pick' ? (
          orders.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6">No canceled orders found.</p>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto divide-y">
              {orders.map((o) => (
                <button
                  key={o.id}
                  onClick={() => pickOrder(o.id)}
                  className="w-full flex items-center justify-between gap-3 py-2.5 px-1 text-left hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">Order #{o.id}{o.shipping_name ? ` · ${o.shipping_name}` : ''}</p>
                    <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</p>
                  </div>
                  {importedOrderIds.has(o.id) && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded shrink-0">
                      Imported
                    </span>
                  )}
                </button>
              ))}
            </div>
          )
        ) : (
          <div className="space-y-3">
            {alreadyImported && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                This order was already imported to overstock — importing again creates duplicate listings.
              </div>
            )}
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6">No panel lines on this order to import.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground border-b">
                    <tr>
                      <th className="p-2 w-8"></th>
                      <th className="p-2 text-left">Color</th>
                      <th className="p-2 text-left">Ft</th>
                      <th className="p-2 text-left">In</th>
                      <th className="p-2 text-left">Qty</th>
                      <th className="p-2 text-left">Resale $/pc</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.map((r) => (
                      <tr key={r.key} className={r.include ? '' : 'opacity-40'}>
                        <td className="p-2 text-center">
                          <input type="checkbox" checked={r.include} onChange={(e) => setRow(r.key, { include: e.target.checked })} />
                        </td>
                        <td className="p-2 min-w-[150px]">
                          <Select value={r.color} onValueChange={(v) => setRow(r.key, { color: v ?? '' })}>
                            <SelectTrigger className="h-8"><SelectValue placeholder="—" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">— No color —</SelectItem>
                              {COLORS.map((c) => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2"><Input type="number" min={0} className="h-8 w-16" value={r.ft} onChange={(e) => setRow(r.key, { ft: e.target.value })} /></td>
                        <td className="p-2"><Input type="number" min={0} max={11} className="h-8 w-16" value={r.inch} onChange={(e) => setRow(r.key, { inch: e.target.value })} /></td>
                        <td className="p-2"><Input type="number" min={0} className="h-8 w-16" value={r.qty} onChange={(e) => setRow(r.key, { qty: e.target.value })} /></td>
                        <td className="p-2"><Input type="number" step="0.01" className="h-8 w-24" value={r.price} placeholder="—" onChange={(e) => setRow(r.key, { price: e.target.value })} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex justify-between gap-2 pt-2">
              {orderId ? <span /> : <Button variant="outline" onClick={() => setStep('pick')}>Back</Button>}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleImport} disabled={saving || included.length === 0}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create {included.length} listing{included.length === 1 ? '' : 's'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
