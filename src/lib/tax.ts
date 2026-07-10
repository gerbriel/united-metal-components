// Order tax — the client mirror of the authoritative recompute_order_totals DB
// trigger (migration 046). Rates are admin-editable (app_settings); tax mode per
// tier comes from TIER_PRICING (pricing-tiers.ts):
//   exempt → 0 · ag → federal + state-ag · everything else → standard sales rate.

import { taxModeForTier } from './pricing-tiers'

export interface TaxRates {
  sales: number   // standard sales-tax rate, e.g. 0.0825
  federal: number // federal rate applied to agricultural sales
  stateAg: number // state agricultural rate
}

export const DEFAULT_TAX_RATES: TaxRates = { sales: 0.0825, federal: 0, stateAg: 0 }

const round2 = (n: number) => Math.round(n * 100) / 100

// The tax rate that applies to a customer's tier.
export function taxRateForTier(tier: string | null | undefined, rates: TaxRates): number {
  switch (taxModeForTier(tier ?? '')) {
    case 'exempt': return 0
    case 'ag':     return rates.federal + rates.stateAg
    default:       return rates.sales
  }
}

// Tax owed on an order subtotal for a customer's tier.
export function taxForOrder(subtotal: number, tier: string | null | undefined, rates: TaxRates): number {
  return round2(subtotal * taxRateForTier(tier, rates))
}

// Minimal shape of the supabase client we use here — server and client
// instances differ in generics, so we only rely on `.from(...).select(...)`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RateReader = { from: (table: string) => any }

// Load the tax rates from app_settings via any (client or server) supabase
// client. Falls back to defaults when the table/rows aren't present.
export async function fetchTaxRates(supabase: RateReader): Promise<TaxRates> {
  try {
    const { data } = await supabase.from('app_settings').select('key, value')
    const rows = (data ?? []) as { key: string; value: number | string }[]
    const m = new Map(rows.map((r) => [r.key, Number(r.value)]))
    return {
      sales:   m.get('tax_sales_rate')    ?? DEFAULT_TAX_RATES.sales,
      federal: m.get('tax_federal_rate')  ?? DEFAULT_TAX_RATES.federal,
      stateAg: m.get('tax_state_ag_rate') ?? DEFAULT_TAX_RATES.stateAg,
    }
  } catch {
    return DEFAULT_TAX_RATES
  }
}
