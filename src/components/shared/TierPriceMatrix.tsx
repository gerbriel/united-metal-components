'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Search, Check, Loader2 } from 'lucide-react'
import type { PricingTier } from '@/lib/pricing-tiers'

export interface MatrixProduct {
  id: number
  name: string
  sku: string | null
  price: number
  unit: string | null
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

export default function TierPriceMatrix({
  products, tiers, initialPrices,
}: { products: MatrixProduct[]; tiers: PricingTier[]; initialPrices: TierPriceMap }) {
  const [q, setQ] = useState('')

  const activeTiers = useMemo(() => tiers.filter((t) => t.active !== false), [tiers])
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
        default; leave a tier cell blank to charge that base. Prices save automatically.
      </p>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b bg-slate-50">
              <th className="text-left p-3 font-medium sticky left-0 bg-slate-50 z-10 min-w-[220px]">Product</th>
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
              <tr><td colSpan={2 + activeTiers.length} className="p-6 text-center text-muted-foreground">No products match.</td></tr>
            )}
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/60">
                <td className="p-3 sticky left-0 bg-white z-10 min-w-[220px]">
                  <p className="font-medium leading-tight">{p.name}</p>
                  {p.sku && <p className="text-xs text-muted-foreground font-mono">{p.sku}{p.unit ? ` · per ${p.unit}` : ''}</p>}
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
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
