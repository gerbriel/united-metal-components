// Customer pricing tiers. These now live in the admin-managed `pricing_tiers`
// table (migration 041) — this module holds the shared type, the pure helpers
// that operate on a fetched tier list, and the seed defaults used as a fallback
// when the table hasn't been read yet (or pre-migration).
//
// Each tier belongs to exactly one account type, so a retail customer only ever
// gets retail tiers and a contractor only contractor tiers — keeping Account
// Type and Pricing Tier in sync wherever the pair is edited.

export type CustomerType = 'retail' | 'contractor' | 'ag'

export interface PricingTier {
  value: string          // the `key` stored on profiles.pricing_tier
  label: string
  group: CustomerType    // the account type this tier belongs to
  active?: boolean       // inactive tiers are hidden from pickers but still label existing data
  sort?: number
}

// Seed set — mirrors the rows inserted by migration 041. Used as a fallback and
// for building a static label map for read-only displays.
export const DEFAULT_PRICING_TIERS: PricingTier[] = [
  { value: 'retail',                    label: 'Retail',                            group: 'retail',     active: true, sort: 10 },
  { value: 'retail_tax_exempt',         label: 'Retail (Tax Exempt)',               group: 'retail',     active: true, sort: 20 },
  { value: 'contractor',                label: 'Contractor',                        group: 'contractor', active: true, sort: 30 },
  { value: 'contractor_tax_exempt_tbd', label: 'Contractor (Tax Exempt - Pending)', group: 'contractor', active: true, sort: 40 },
  { value: 'contractor_tax_exempt',     label: 'Contractor (Tax Exempt)',           group: 'contractor', active: true, sort: 50 },
  { value: 'ag_tax_exempt',             label: 'Agricultural (Tax Exempt)',         group: 'ag',         active: true, sort: 60 },
]

// Display label + accent for each account type, shared by the badges/pickers.
export const CUSTOMER_TYPE_LABEL: Record<CustomerType, string> = {
  retail: 'Retail',
  contractor: 'Contractor',
  ag: 'Agricultural',
}

// value → label for the seed tiers. A read-only fallback; DB-driven surfaces
// build their own map from fetched tiers so renames/new tiers show correctly.
export const PRICING_TIER_LABEL: Record<string, string> = Object.fromEntries(
  DEFAULT_PRICING_TIERS.map((t) => [t.value, t.label]),
)

// Build a value → label map from any tier list.
export function tierLabelMap(tiers: PricingTier[]): Record<string, string> {
  return Object.fromEntries(tiers.map((t) => [t.value, t.label]))
}

// The (active) tiers offered for a given account type (empty until a type is set).
export function tiersForType(tiers: PricingTier[], type: CustomerType | null | undefined): PricingTier[] {
  if (!type) return []
  return tiers.filter((t) => t.group === type && t.active !== false)
}

// Whether a tier is valid for an account type. Unassigned (null) is always OK.
export function tierBelongsToType(
  tiers: PricingTier[],
  tier: string | null | undefined,
  type: CustomerType | null | undefined,
): boolean {
  if (!tier) return true
  if (!type) return false
  return tiers.some((t) => t.value === tier && t.group === type)
}

// The tier to fall back to when an account type is set but the current tier
// doesn't fit it — the first active tier of that type, or null if none exist.
export function defaultTierForType(tiers: PricingTier[], type: CustomerType): string | null {
  return tiersForType(tiers, type)[0]?.value ?? null
}

// ── Pricing & tax resolution ──────────────────────────────────
// Only the two "base" tiers (Retail, Contractor) carry per-item prices in the
// price list. Every other tier derives its price from one of them and differs
// only in how tax is applied, so staff never enter prices for the derived ones:
//   • retail_tax_exempt          → Retail price, no tax
//   • contractor_tax_exempt      → Contractor price, no tax
//   • contractor_tax_exempt_tbd  → Contractor price, taxed until the exemption
//                                  is approved (pending)
//   • ag_tax_exempt              → Retail price, taxed at the agricultural rate
//                                  (federal + state ag), not standard sales tax
export type TaxMode = 'sales' | 'exempt' | 'ag'

export interface TierPricing {
  basis: string   // tier key whose per-item price this tier charges
  tax: TaxMode    // how tax is figured for this tier
}

export const TIER_PRICING: Record<string, TierPricing> = {
  retail:                    { basis: 'retail',     tax: 'sales' },
  retail_tax_exempt:         { basis: 'retail',     tax: 'exempt' },
  contractor:                { basis: 'contractor', tax: 'sales' },
  contractor_tax_exempt:     { basis: 'contractor', tax: 'exempt' },
  contractor_tax_exempt_tbd: { basis: 'contractor', tax: 'sales' },
  ag_tax_exempt:             { basis: 'retail',     tax: 'ag' },
}

// The tier a given tier inherits its per-item price from (itself when it's a
// base tier, or an unknown/custom tier that prices itself).
export const priceBasisTier = (key: string): string => TIER_PRICING[key]?.basis ?? key

// A tier needs its own column in the price list only when it prices itself.
export const isBasePriceTier = (key: string): boolean => priceBasisTier(key) === key

// How tax is applied for a tier (defaults to standard sales tax).
export const taxModeForTier = (key: string): TaxMode => TIER_PRICING[key]?.tax ?? 'sales'
