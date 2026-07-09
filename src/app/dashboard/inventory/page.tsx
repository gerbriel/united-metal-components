export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import InventoryActions from '@/components/shared/InventoryActions'
import InventoryNav from '@/components/shared/InventoryNav'
import RealtimeRefresh from '@/components/shared/RealtimeRefresh'
import InventoryAccordion from '@/components/shared/InventoryAccordion'
import { isWarehouseRole, isAdminRole } from '@/types/database'
import type { Product } from '@/types/database'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Inventory — Dashboard' }

type JoinedCategory = { id: number; name: string; slug: string; sort_order: number; icon: string | null } | null
type InvProduct = Product & { product_categories: JoinedCategory }

export default async function InventoryPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, employee_role')
    .eq('id', user!.id)
    .single()

  const role = (profile as { role?: string } | null)?.role ?? ''
  const isWarehouse = isWarehouseRole(role)
  const isAdmin = isAdminRole(role)

  const [{ data: products }, { data: categories }, { data: overRows }, { data: tierRows }] = await Promise.all([
    supabase
      .from('products')
      .select('*, product_categories(id, name, slug, sort_order, icon)')
      .order('sort_order')
      .order('name'),
    supabase.from('product_categories').select('*').order('sort_order').order('name'),
    // Live overstock totals for the overstock parent rows (null/[] if the table
    // isn't there yet — the accordion just falls back to the shell fields).
    supabase.from('panel_overstock').select('product_id, quantity, unit_price').eq('archived', false),
    // Per-item Contractor / Retail overrides for the inventory price columns.
    // A blank tier price falls back to the product's base price in the accordion.
    supabase.from('product_tier_prices').select('product_id, tier_key, price').in('tier_key', ['contractor', 'retail']),
  ])

  // productId → { contractor?, retail? } explicit tier-price overrides.
  const tierPrices: Record<number, { contractor?: number; retail?: number }> = {}
  for (const r of (tierRows ?? []) as { product_id: number; tier_key: string; price: number | string }[]) {
    const e = (tierPrices[r.product_id] ??= {})
    if (r.tier_key === 'contractor') e.contractor = Number(r.price)
    else if (r.tier_key === 'retail') e.retail = Number(r.price)
  }

  // Sum logged pieces per overstock product: total value + piece count.
  const overstockStats: Record<number, { pieces: number; totalValue: number }> = {}
  for (const r of (overRows ?? []) as { product_id: number; quantity: number; unit_price: number | null }[]) {
    const s = (overstockStats[r.product_id] ??= { pieces: 0, totalValue: 0 })
    const q = Number(r.quantity) || 0
    s.pieces += q
    s.totalValue += (Number(r.unit_price) || 0) * q
  }

  // Group products under their category (category sort_order). Within each group
  // products keep the admin-set sort_order (name as tiebreak) from the query.
  const byCat = new Map<number, InvProduct[]>()
  for (const p of (products ?? []) as InvProduct[]) {
    const cid = p.product_categories?.id ?? -1
    const arr = byCat.get(cid)
    if (arr) arr.push(p)
    else byCat.set(cid, [p])
  }

  const groups = (categories ?? [])
    .map((c) => ({ id: c.id, name: c.name, icon: c.icon as string | null, items: byCat.get(c.id) ?? [] }))
    .filter((g) => g.items.length > 0)
  const uncategorized = byCat.get(-1)
  if (uncategorized?.length) groups.push({ id: -1, name: 'Uncategorized', icon: null, items: uncategorized })

  return (
    <div className="space-y-5">
      <RealtimeRefresh />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-sm text-muted-foreground">Standard products — grouped by storefront category</p>
        </div>
        <InventoryActions categories={categories ?? []} />
      </div>

      <InventoryNav active="products" />

      <Card className="p-2">
        <InventoryAccordion
          groups={groups}
          isWarehouse={isWarehouse}
          isAdmin={isAdmin}
          categories={categories ?? []}
          overstockStats={overstockStats}
          tierPrices={tierPrices}
        />
      </Card>
    </div>
  )
}
