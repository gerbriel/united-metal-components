import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_PRICING_TIERS, type PricingTier } from './pricing-tiers'

// Fetch the admin-managed pricing tiers (migration 041), ordered for display.
// Falls back to the seed defaults if the table is empty or missing (e.g. before
// the migration is applied), so the app keeps working either way.
export async function getPricingTiers(opts: { activeOnly?: boolean } = {}): Promise<PricingTier[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pricing_tiers')
    .select('key, label, customer_type, sort_order, active')
    .order('sort_order')
    .order('label')

  if (error || !data || data.length === 0) return DEFAULT_PRICING_TIERS

  const tiers: PricingTier[] = data.map((r: { key: string; label: string; customer_type: string; sort_order: number; active: boolean }) => ({
    value: r.key,
    label: r.label,
    group: r.customer_type as 'retail' | 'contractor',
    active: r.active,
    sort: r.sort_order,
  }))
  return opts.activeOnly ? tiers.filter((t) => t.active !== false) : tiers
}
