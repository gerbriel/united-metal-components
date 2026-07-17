'use client'

import { Fragment, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Check, Loader2 } from 'lucide-react'
import { isBasePriceTier, type PricingTier } from '@/lib/pricing-tiers'
import { COLOR_SKUS, type FinishClass, type PriceMetric } from '@/lib/product-config'
import { finishPriceKey, type FinishPriceMap } from '@/lib/finishes'

export interface MatrixProduct {
  id: number
  name: string
  sku: string | null
  price: number
  unit: string | null
  price_metric: PriceMetric
}

// key `${productId}:${tierKey}` → override price
export type TierPriceMap = Record<string, number>

const cellKey = (productId: number, tierKey: string) => `${productId}:${tierKey}`

// One editable price cell — isolated local state + autosave on blur so typing in
// a big matrix never re-renders the whole table.
function PriceCell({
  productId, tierKey, initial, basePrice,
}: { productId: number; tierKey: string; initial: number | undefined; basePrice: number }) {
  const [val, setVal] = useState(initial != null ? String(initial) : '')
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const supabase = createClient()

  const save = async () => {
    const trimmed = val.trim()
    // Unchanged → skip.
    if (trimmed === (initial != null ? String(initial) : '')) return
    setState('saving')
    if (trimmed === '') {
      const { error } = await supabase.from('product_tier_prices').delete()
        .eq('product_id', productId).eq('tier_key', tierKey)
      if (error) { toast.error('Failed to clear price'); setState('idle'); return }
    } else {
      const price = Number(trimmed)
      if (Number.isNaN(price) || price < 0) { toast.error('Enter a valid price'); return }
      setVal(price.toFixed(2))
      const { error } = await supabase.from('product_tier_prices')
        .upsert({ product_id: productId, tier_key: tierKey, price, updated_at: new Date().toISOString() }, { onConflict: 'product_id,tier_key' })
      if (error) { toast.error('Failed to save price'); setState('idle'); return }
    }
    setState('saved')
    setTimeout(() => setState('idle'), 1200)
  }

  return (
    <div className="relative">
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">$</span>
      <Input
        inputMode="decimal"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={save}
        placeholder={basePrice.toFixed(2)}
        className="h-8 w-28 pl-5 pr-6 text-sm text-right font-mono"
      />
      {state === 'saving' && <Loader2 className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-muted-foreground" />}
      {state === 'saved' && <Check className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-green-600" />}
    </div>
  )
}

// A per-finish price override cell (Galvalume / Pattern) for a colorable product.
// Modeled on PriceCell — isolated local state, autosave on blur — but writes to
// product_finish_prices keyed by finish_class. Blank falls back to the base tier
// price (Solid), so the placeholder shows the product's base price.
function FinishPriceCell({
  productId, tierKey, finishClass, initial, basePrice,
}: { productId: number; tierKey: string; finishClass: FinishClass; initial: number | undefined; basePrice: number }) {
  const [val, setVal] = useState(initial != null ? String(initial) : '')
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const supabase = createClient()

  const save = async () => {
    const trimmed = val.trim()
    // Unchanged → skip.
    if (trimmed === (initial != null ? String(initial) : '')) return
    setState('saving')
    if (trimmed === '') {
      const { error } = await supabase.from('product_finish_prices').delete()
        .eq('product_id', productId).eq('tier_key', tierKey).eq('finish_class', finishClass)
      if (error) { toast.error('Failed to clear price'); setState('idle'); return }
    } else {
      const price = Number(trimmed)
      if (Number.isNaN(price) || price < 0) { toast.error('Enter a valid price'); return }
      setVal(price.toFixed(2))
      const { error } = await supabase.from('product_finish_prices')
        .upsert({ product_id: productId, tier_key: tierKey, finish_class: finishClass, price, updated_at: new Date().toISOString() }, { onConflict: 'product_id,tier_key,finish_class' })
      if (error) { toast.error('Failed to save price'); setState('idle'); return }
    }
    setState('saved')
    setTimeout(() => setState('idle'), 1200)
  }

  return (
    <div className="relative">
      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">$</span>
      <Input
        inputMode="decimal"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={save}
        placeholder={basePrice.toFixed(2)}
        className="h-7 w-24 pl-4 pr-5 text-xs text-right font-mono"
      />
      {state === 'saving' && <Loader2 className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-muted-foreground" />}
      {state === 'saved' && <Check className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-green-600" />}
    </div>
  )
}

// The product's base price (products.price) — the fallback charged when a tier
// cell is blank. Editable inline here so admins set base + tier prices on one
// screen; autosaves to the products table on blur. Base can't be blank.
function BaseCell({ productId, initial }: { productId: number; initial: number }) {
  const [baseline, setBaseline] = useState(initial.toFixed(2))
  const [val, setVal] = useState(initial.toFixed(2))
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const supabase = createClient()

  const save = async () => {
    const trimmed = val.trim()
    if (trimmed === baseline) return
    const price = Number(trimmed)
    if (trimmed === '' || Number.isNaN(price) || price < 0) {
      toast.error('Enter a valid base price')
      setVal(baseline)
      return
    }
    setState('saving')
    const { error } = await supabase.from('products').update({ price }).eq('id', productId)
    if (error) { toast.error('Failed to save base price'); setState('idle'); setVal(baseline); return }
    setVal(price.toFixed(2))
    setBaseline(price.toFixed(2))
    setState('saved')
    setTimeout(() => setState('idle'), 1200)
  }

  return (
    <div className="relative">
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">$</span>
      <Input
        inputMode="decimal"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={save}
        className="h-8 w-28 pl-5 pr-6 text-sm text-right font-mono"
      />
      {state === 'saving' && <Loader2 className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-muted-foreground" />}
      {state === 'saved' && <Check className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-green-600" />}
    </div>
  )
}

// How the product's rate is metered: per_foot (cut by the foot) vs per_piece.
// Isolated local state + autosave on change, mirroring PriceCell's saving/saved
// UX so flipping one product never re-renders the whole matrix. Optimistic —
// reverts the Select if the write fails.
function PricedCell({ productId, initial }: { productId: number; initial: PriceMetric }) {
  const [val, setVal] = useState<PriceMetric>(initial)
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const supabase = createClient()

  const save = async (next: PriceMetric) => {
    if (next === val) return
    const prev = val
    setVal(next)
    setState('saving')
    const { error } = await supabase.from('products').update({ price_metric: next }).eq('id', productId)
    if (error) { toast.error('Failed to save'); setVal(prev); setState('idle'); return }
    setState('saved')
    setTimeout(() => setState('idle'), 1200)
  }

  return (
    <div className="inline-flex items-center gap-1">
      <Select value={val} onValueChange={(v: string | null) => { if (v) save(v as PriceMetric) }}>
        <SelectTrigger className="h-8 w-[76px] text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="per_foot">Foot</SelectItem>
          <SelectItem value="per_piece">Piece</SelectItem>
        </SelectContent>
      </Select>
      {state === 'saving' && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
      {state === 'saved' && <Check className="w-3 h-3 text-green-600" />}
    </div>
  )
}

export default function TierPriceMatrix({
  products, tiers, initialPrices, initialFinishPrices,
}: { products: MatrixProduct[]; tiers: PricingTier[]; initialPrices: TierPriceMap; initialFinishPrices: FinishPriceMap }) {
  const [q, setQ] = useState('')

  // Only the base-price tiers (Retail, Contractor) get an editable column —
  // tax-exempt and agricultural tiers derive their price from one of these, so
  // there's nothing to type for them (see TIER_PRICING in pricing-tiers.ts).
  const activeTiers = useMemo(
    () => tiers.filter((t) => t.active !== false && isBasePriceTier(t.value)),
    [tiers],
  )
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return products
    return products.filter((p) => p.name.toLowerCase().includes(s) || (p.sku ?? '').toLowerCase().includes(s))
  }, [q, products])

  if (activeTiers.length === 0) {
    return <p className="text-sm text-muted-foreground">Add a pricing tier above to set item prices.</p>
  }

  return (
    <div className="space-y-3">
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" className="pl-9 h-9" />
      </div>

      <p className="text-xs text-muted-foreground">
        Edit the <span className="font-medium text-foreground">Base</span> price to change the product&apos;s
        default; leave a tier cell blank to charge that base. Only Retail and Contractor are set here —
        tax-exempt and agricultural tiers reuse these automatically. Colorable products get a
        <span className="font-medium text-foreground"> Galvalume</span> and
        <span className="font-medium text-foreground"> Pattern</span> override row (Solid uses the base
        tier price). Prices save automatically.
      </p>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b bg-slate-50">
              <th className="text-left p-3 font-medium sticky left-0 bg-slate-50 z-10 min-w-[220px]">Product</th>
              <th className="text-left p-3 font-medium whitespace-nowrap">Priced</th>
              <th className="text-right p-3 font-medium whitespace-nowrap">Base</th>
              {activeTiers.map((t) => (
                <th key={t.value} className="text-right p-3 font-medium whitespace-nowrap">
                  {t.label}
                  <span className={`ml-1.5 inline-block w-1.5 h-1.5 rounded-full align-middle ${t.group === 'contractor' ? 'bg-orange-400' : t.group === 'ag' ? 'bg-green-500' : 'bg-blue-400'}`} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 && (
              <tr><td colSpan={3 + activeTiers.length} className="p-6 text-center text-muted-foreground">No products match.</td></tr>
            )}
            {filtered.map((p) => {
              const colorable = COLOR_SKUS.has(p.sku ?? '')
              return (
                <Fragment key={p.id}>
                  <tr className="hover:bg-slate-50/60">
                    <td className="p-3 sticky left-0 bg-white z-10 min-w-[220px]">
                      <p className="font-medium leading-tight">{p.name}</p>
                      {p.sku && <p className="text-xs text-muted-foreground font-mono">{p.sku}{p.unit ? ` · per ${p.unit}` : ''}</p>}
                    </td>
                    <td className="p-2">
                      <PricedCell productId={p.id} initial={p.price_metric} />
                    </td>
                    <td className="p-2 text-right">
                      <BaseCell productId={p.id} initial={Number(p.price)} />
                    </td>
                    {activeTiers.map((t) => (
                      <td key={t.value} className="p-2 text-right">
                        <PriceCell
                          productId={p.id}
                          tierKey={t.value}
                          initial={initialPrices[cellKey(p.id, t.value)]}
                          basePrice={Number(p.price)}
                        />
                      </td>
                    ))}
                  </tr>
                  {/* Colorable products get a subordinate finish-override row: Galvalume +
                      Pattern per base tier. Solid isn't edited here — it's the Base cell above. */}
                  {colorable && (
                    <tr className="bg-slate-50 text-xs">
                      <td className="pl-3 pr-3 py-1.5 sticky left-0 bg-slate-50 z-10 min-w-[220px] align-top">
                        <span className="text-muted-foreground">Finish overrides</span>
                      </td>
                      <td className="py-1.5" aria-hidden />
                      <td className="py-1.5" aria-hidden />
                      {activeTiers.map((t) => (
                        <td key={t.value} className="px-2 py-1.5 text-right align-top">
                          <div className="space-y-1">
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Galvalume</span>
                              <FinishPriceCell
                                productId={p.id}
                                tierKey={t.value}
                                finishClass="galvalume"
                                initial={initialFinishPrices[finishPriceKey(p.id, t.value, 'galvalume')]}
                                basePrice={Number(p.price)}
                              />
                            </div>
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Pattern</span>
                              <FinishPriceCell
                                productId={p.id}
                                tierKey={t.value}
                                finishClass="pattern"
                                initial={initialFinishPrices[finishPriceKey(p.id, t.value, 'pattern')]}
                                basePrice={Number(p.price)}
                              />
                            </div>
                          </div>
                        </td>
                      ))}
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
