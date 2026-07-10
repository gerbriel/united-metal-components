export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isAdminRole, isStaffRole } from '@/types/database'
import PricingTierManager, { type PricingTierRow } from '@/components/shared/PricingTierManager'
import TierPriceMatrix, { type MatrixProduct, type TierPriceMap } from '@/components/shared/TierPriceMatrix'
import TaxRateSettings from '@/components/shared/TaxRateSettings'
import { getPricingTiers } from '@/lib/pricing-tiers.server'
import { fetchTaxRates } from '@/lib/tax'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Pricing Tiers — Dashboard' }

export default async function PricingTiersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = (profile as { role?: string } | null)?.role ?? ''
  if (!isStaffRole(role)) redirect('/')
  if (!isAdminRole(role)) redirect('/dashboard')

  const [{ data: tiers }, { data: profiles }, { data: products }, { data: overrides }, activeTiers, taxRates] = await Promise.all([
    supabase.from('pricing_tiers').select('*').order('sort_order').order('label'),
    supabase.from('profiles').select('pricing_tier'),
    supabase.from('products').select('id, name, sku, price, unit').eq('active', true).order('name'),
    supabase.from('product_tier_prices').select('product_id, tier_key, price'),
    getPricingTiers({ activeOnly: true }),
    fetchTaxRates(supabase),
  ])

  // How many customers are on each tier — drives the "reassign first" delete guard.
  const counts = new Map<string, number>()
  for (const p of profiles ?? []) {
    const t = (p as { pricing_tier: string | null }).pricing_tier
    if (t) counts.set(t, (counts.get(t) ?? 0) + 1)
  }
  const rows: PricingTierRow[] = (tiers ?? []).map(
    (t: Omit<PricingTierRow, 'usageCount'>) => ({ ...t, usageCount: counts.get(t.key) ?? 0 }),
  )

  // Per-item tier prices, keyed `${productId}:${tierKey}` for the matrix editor.
  const priceMap: TierPriceMap = {}
  for (const o of overrides ?? []) {
    const row = o as { product_id: number; tier_key: string; price: number | string }
    priceMap[`${row.product_id}:${row.tier_key}`] = Number(row.price)
  }
  const matrixProducts = (products ?? []) as MatrixProduct[]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Pricing Tiers</h1>
        <p className="text-sm text-muted-foreground">
          The tiers customers can be assigned. Each belongs to an account type — retail customers only get
          retail tiers, contractors only contractor tiers.
        </p>
      </div>
      <PricingTierManager initial={rows} />

      <div className="pt-4 border-t">
        <h2 className="text-lg font-bold">Item Prices by Tier</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Set a per-tier price for any product. Blank cells charge the product&apos;s base price.
        </p>
        <TierPriceMatrix products={matrixProducts} tiers={activeTiers} initialPrices={priceMap} />
      </div>

      <div className="pt-4 border-t">
        <h2 className="text-lg font-bold">Tax Rates</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Standard sales tax applies to retail and contractor orders. Agricultural customers are taxed at
          federal + state ag on the retail price; tax-exempt tiers pay none.
        </p>
        <TaxRateSettings initial={taxRates} />
      </div>
    </div>
  )
}
