'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Loader2, Trash2, AlertTriangle, RotateCcw, Save } from 'lucide-react'
import { formatOrderQty } from '@/lib/orderUnits'

// Tax mirrors checkout / OrderBuilder: flat 8.25%, waived for tax-exempt tiers.
const TAX_RATE = 0.0825

export interface EditorItem {
  id: number
  name: string
  sku: string | null
  unit: string | null
  quantity: number
  unit_price: number
  total_price: number
  length_feet: number | null
  linear_feet: number | null
  product_price: number | null   // current products.price — pricing reference
  is_overstock: boolean          // priced per listing, not from products.price
  detail: string | null          // color / length line note
}

// Feet in a single piece of a length line. linear_feet carries the whole order's
// footage (and any fractional-inch cut), so per-piece = linear_feet / qty; fall
// back to the whole-foot length_feet when linear_feet wasn't recorded.
function perPieceFeet(it: EditorItem): number | null {
  if (it.length_feet == null) return null
  if (it.linear_feet != null && it.quantity > 0) return it.linear_feet / it.quantity
  return it.length_feet
}

// Expected unit price implied by the CURRENT product price, so staff can spot a
// line whose stored price has drifted (product re-priced after the order was
// placed). Mirrors cart's itemUnitPrice: length lines are priced per piece
// (price/ft × feet), everything else per unit. Overstock is priced per listing
// (no products.price reference), so it has no expected value.
function expectedUnit(it: EditorItem): number | null {
  if (it.is_overstock || it.product_price == null) return null
  const ppf = perPieceFeet(it)
  return ppf != null ? it.product_price * ppf : it.product_price
}

const money = (n: number) => `$${n.toFixed(2)}`
const near = (a: number, b: number) => Math.abs(a - b) < 0.005
const round2 = (n: number) => Math.round(n * 100) / 100

interface Row extends EditorItem {
  priceInput: string   // editable unit price (string so the field can be cleared)
}

export default function OrderPriceEditor({
  orderId,
  items,
  exempt,
  storedTotal,
}: {
  orderId: number
  items: EditorItem[]
  exempt: boolean
  storedTotal: number
}) {
  const router = useRouter()
  const supabase = createClient()

  const [rows, setRows] = useState<Row[]>(
    items.map((it) => ({ ...it, priceInput: it.unit_price.toFixed(2) })),
  )
  const [removed, setRemoved] = useState<number[]>([])
  const [saving, setSaving] = useState(false)

  const present = rows.filter((r) => !removed.includes(r.id))

  const unitOf = (r: Row) => parseFloat(r.priceInput) || 0
  const lineTotal = (r: Row) => unitOf(r) * r.quantity

  // Mirror the DB recompute_order_totals trigger exactly (migration 040) so the
  // preview matches the totals the trigger writes on save — no jump on refresh.
  const subtotal = round2(present.reduce((s, r) => s + lineTotal(r), 0))
  const tax = exempt ? 0 : round2(subtotal * TAX_RATE)
  const total = round2(subtotal + tax)

  const dirty = useMemo(
    () => removed.length > 0 || rows.some((r) => !near(unitOf(r), r.unit_price)),
    [rows, removed],
  )

  const setPrice = (id: number, priceInput: string) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, priceInput } : r)))

  const applyExpected = (id: number, value: number) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, priceInput: value.toFixed(2) } : r)))

  const save = async () => {
    if (present.length === 0) {
      toast.error('An order needs at least one line item — cancel the order instead.')
      return
    }
    setSaving(true)

    // Persist each changed line's price, then drop removed lines. The DB
    // recompute_order_totals trigger (migration 040) re-derives the order's
    // subtotal / tax / total from these rows — including tax exemption — so the
    // totals are NOT written here; the database stays the single source of
    // truth. Run sequentially so the final trigger firing sees the fully
    // updated line set. `.select()` guards against a write being silently
    // filtered to 0 rows by RLS (which would look like a no-op success).
    try {
      for (const r of present) {
        if (near(unitOf(r), r.unit_price)) continue // unchanged
        const unit = unitOf(r)
        const { data, error } = await supabase
          .from('order_items')
          .update({ unit_price: unit, total_price: round2(unit * r.quantity) })
          .eq('id', r.id)
          .select('id')
        if (error) throw new Error(error.message)
        if (!data?.length) throw new Error('You do not have permission to edit this order line.')
      }
      for (const id of removed) {
        const { data, error } = await supabase
          .from('order_items')
          .delete()
          .eq('id', id)
          .select('id')
        if (error) throw new Error(error.message)
        if (!data?.length) throw new Error('You do not have permission to remove this order line.')
      }
    } catch (e) {
      toast.error(`Failed to save pricing: ${e instanceof Error ? e.message : 'Unknown error'}`)
      setSaving(false)
      return
    }

    toast.success('Order pricing updated')
    router.refresh()
    setSaving(false)
  }

  const reset = () => {
    setRows(items.map((it) => ({ ...it, priceInput: it.unit_price.toFixed(2) })))
    setRemoved([])
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Review and correct line prices before accepting this order. Edits recompute the order total on save.
      </p>

      <div className="space-y-2">
        {present.map((r) => {
          const exp = expectedUnit(r)
          const mismatch = exp != null && !near(exp, unitOf(r))
          return (
            <div key={r.id} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatOrderQty({ quantity: r.quantity, unit: r.unit, lengthFeet: r.length_feet, linearFeet: r.linear_feet })}
                    {r.detail ? ` · ${r.detail}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => setRemoved((ids) => [...ids, r.id])}
                  className="text-red-500 hover:text-red-700 shrink-0"
                  aria-label={`Remove ${r.name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Unit price</label>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground text-sm">$</span>
                    <Input
                      type="number" step="0.01" min={0}
                      className="h-8 w-28"
                      value={r.priceInput}
                      onChange={(e) => setPrice(r.id, e.target.value)}
                    />
                  </div>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xs text-muted-foreground">Line total</p>
                  <p className="font-mono font-semibold text-sm">{money(lineTotal(r))}</p>
                </div>
              </div>

              {mismatch && exp != null && (
                <div className="flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-2.5 py-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-800">
                    Current product price implies <span className="font-semibold">{money(exp)}</span>
                    {perPieceFeet(r) != null && r.product_price != null
                      ? ` (${money(r.product_price)}/${r.unit ?? 'ft'} × ${Number(perPieceFeet(r)!.toFixed(2))} ft)`
                      : ''}
                  </p>
                  <Button
                    size="sm" variant="outline"
                    className="h-6 px-2 text-xs ml-auto shrink-0"
                    onClick={() => applyExpected(r.id, exp)}
                  >
                    Apply
                  </Button>
                </div>
              )}
              {r.is_overstock && (
                <p className="text-xs text-muted-foreground italic">Overstock — priced per listing.</p>
              )}
            </div>
          )
        })}
      </div>

      <div className="border-t pt-3 space-y-1 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-mono">{money(subtotal)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Tax{exempt ? ' (exempt)' : ''}</span><span className="font-mono">{money(tax)}</span></div>
        <div className="flex justify-between font-semibold">
          <span>Total</span>
          <span className="font-mono text-primary">{money(total)}</span>
        </div>
        {!near(total, storedTotal) && (
          <p className="text-xs text-amber-700 text-right">Was {money(storedTotal)} — save to apply.</p>
        )}
      </div>

      <div className="flex gap-2">
        <Button className="flex-1 gap-2" onClick={save} disabled={saving || !dirty}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save pricing
        </Button>
        <Button variant="outline" className="gap-2" onClick={reset} disabled={saving || !dirty}>
          <RotateCcw className="w-4 h-4" /> Reset
        </Button>
      </div>
    </div>
  )
}
