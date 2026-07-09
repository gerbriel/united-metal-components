export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { OVERSTOCK_SKUS, COLORS } from '@/lib/product-config'
import OverstockGrid, { type OverstockListing } from '@/components/shared/OverstockGrid'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Overstock Panels' }

// Palette index for stable, showroom-like ordering (group by finish, then length).
const colorRank = (name: string | null) => {
  if (!name) return COLORS.length            // bare pieces last
  const i = COLORS.findIndex((c) => c.name === name)
  return i === -1 ? COLORS.length + 1 : i
}

// Overstock isn't a category. Each in-stock piece (a distinct color + length) is
// treated as its own product here — a 3D-rendered card in that finish that adds
// the exact listing to the cart. Prices stay staff-only (quote flow), so only
// dimensions, color, and net-available count reach the storefront, via the
// SECURITY DEFINER `public_panel_overstock` RPC (migration 032).
export default async function OverstockPage() {
  const supabase = await createClient()

  const [{ data: products }, { data: rows }] = await Promise.all([
    // The catalog product(s) overstock panels are sold under. SKUs are
    // admin-editable, so match case-insensitively (ilike, no wildcards).
    supabase
      .from('products')
      .select('*, product_categories(name, slug)')
      .or([...OVERSTOCK_SKUS].map((s) => `sku.ilike.${s}`).join(','))
      .eq('active', true),
    (supabase.rpc as any)('public_panel_overstock'),
  ])

  type OverstockRow = { id: number; product_id: number; color: string | null; length_ft: number; length_in: number; available_qty: number }
  const productList = (products ?? []) as OverstockListing['product'][]
  const byId = new Map(productList.map((p) => [Number(p.id), p]))
  const listings: OverstockListing[] = ((rows ?? []) as OverstockRow[])
    .filter((r) => Number(r.available_qty) > 0 && byId.has(Number(r.product_id)))
    .map((r) => ({
      id: Number(r.id),
      product: byId.get(Number(r.product_id))!,
      color: r.color ?? null,
      lengthFt: Number(r.length_ft),
      lengthIn: Number(r.length_in),
      qty: Number(r.available_qty),
    }))
    .sort(
      (a, b) =>
        colorRank(a.color) - colorRank(b.color) ||
        a.lengthFt - b.lengthFt ||
        a.lengthIn - b.lengthIn,
    )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/products" className="hover:text-primary">Products</Link>
        <span>/</span>
        <span className="text-foreground">Overstock</span>
      </nav>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">Overstock Panels</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Pre-made panels in the exact lengths and colors below, at overstock prices. Limited
          quantities — once they&apos;re gone, they&apos;re gone.
        </p>
      </div>

      <OverstockGrid listings={listings} />
    </div>
  )
}
