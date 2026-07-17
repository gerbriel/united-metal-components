export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import InventoryActions from '@/components/shared/InventoryActions'
import InventoryNav from '@/components/shared/InventoryNav'
import RealtimeRefresh from '@/components/shared/RealtimeRefresh'
import InventoryAccordion from '@/components/shared/InventoryAccordion'
import type { TrimVariant, HatBraceVariant } from '@/components/shared/InventoryAccordion'
import InventoryCategoryNav from '@/components/shared/InventoryCategoryNav'
import { isWarehouseRole, isAdminRole, isOfficeRole } from '@/types/database'
import type { Product } from '@/types/database'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Inventory — Dashboard' }

type JoinedCategory = { id: number; name: string; slug: string; sort_order: number; icon: string | null } | null
type InvProduct = Product & { product_categories: JoinedCategory }

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const supabase = await createClient()
  const { cat } = await searchParams
  const activeCat = cat ?? 'all'

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, employee_role')
    .eq('id', user!.id)
    .single()

  const role = (profile as { role?: string } | null)?.role ?? ''
  const isWarehouse = isWarehouseRole(role)
  const isAdmin = isAdminRole(role)
  const isOffice = isOfficeRole(role)

  const [{ data: products }, { data: categories }, { data: overRows }, { data: tierRows }, { data: trimRows }, { data: hatBraceRows }] = await Promise.all([
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
    // Per-COLOR trim piece stock — one line per finish (+ optional source coil).
    // Grouped by product_id below into the expandable trim sub-rows.
    supabase.from('trim_stock').select('id, product_id, finish_id, qty, coil_id, finishes(name, hex), product_coils(coil_identifier)'),
    // Per-LENGTH hat-channel / brace piece stock — one line per cut length (+ coil).
    // Grouped by product_id below into the expandable hat/brace sub-rows.
    supabase.from('hat_brace_stock').select('id, product_id, length_ft, qty, coil_id, product_coils(coil_identifier)'),
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

  // productId → per-variation stock lines for the expandable trim / hat-brace
  // rows. Trim keys by finish (color); hat/brace keys by cut length. Same reduce
  // shape as overstockStats above; [] fallback if the tables aren't there yet.
  // Supabase infers the many-to-one joins as arrays; at runtime they're single
  // objects (or null), which is what TrimVariant/HatBraceVariant model — hence the
  // cast through unknown.
  const trimStock: Record<number, TrimVariant[]> = {}
  for (const r of (trimRows ?? []) as unknown as (TrimVariant & { product_id: number })[]) {
    (trimStock[r.product_id] ??= []).push(r)
  }
  const hatBraceStock: Record<number, HatBraceVariant[]> = {}
  for (const r of (hatBraceRows ?? []) as unknown as (HatBraceVariant & { product_id: number })[]) {
    (hatBraceStock[r.product_id] ??= []).push(r)
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

  const allGroups = (categories ?? [])
    .map((c) => ({ id: c.id, name: c.name, slug: c.slug as string, icon: c.icon as string | null, items: byCat.get(c.id) ?? [] }))
    .filter((g) => g.items.length > 0)
  const uncategorized = byCat.get(-1)
  if (uncategorized?.length) allGroups.push({ id: -1, name: 'Uncategorized', slug: 'uncategorized', icon: null, items: uncategorized })

  // Category sub-nav items (only categories that actually hold products).
  const navCategories = allGroups.map((g) => ({ slug: g.slug, name: g.name, icon: g.icon, count: g.items.length }))
  // Show every category, or just the one selected via ?cat=<slug>.
  const shownGroups = activeCat === 'all' ? allGroups : allGroups.filter((g) => g.slug === activeCat)
  const activeName = navCategories.find((c) => c.slug === activeCat)?.name

  return (
    <div className="space-y-5">
      <RealtimeRefresh />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-sm text-muted-foreground">
            {activeCat === 'all' ? 'Products — grouped by category' : `${activeName ?? 'Category'} — products & variant stock`}
          </p>
        </div>
        <InventoryActions categories={categories ?? []} isAdmin={isAdmin} isOffice={isOffice} />
      </div>

      <InventoryNav active="products" />
      <InventoryCategoryNav categories={navCategories} active={activeCat} />

      <Card className="p-2">
        <InventoryAccordion
          groups={shownGroups}
          isWarehouse={isWarehouse}
          isAdmin={isAdmin}
          isOffice={isOffice}
          categories={categories ?? []}
          overstockStats={overstockStats}
          tierPrices={tierPrices}
          trimStock={trimStock}
          hatBraceStock={hatBraceStock}
        />
      </Card>
    </div>
  )
}
