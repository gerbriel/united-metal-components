// Code-side finish-class pricing, mirroring the DB (migrations 055-059).
//
// A colorable line's per-item price resolves in three steps — the same order as
// the SQL finish_class_price() function (migration 059):
//   1. product_finish_prices(product, base tier, finish class)   -- finish-specific
//   2. product_tier_prices(product, base tier)                   -- the base/solid tier price
//   3. products.price                                            -- base fallback
//
// finish_class is derived from the chosen color via finishClassOf() in
// product-config.ts. "Base tier" means a self-priced tier (retail / contractor);
// derived tiers (retail_tax_exempt, ag_tax_exempt, …) resolve to their basis
// first via priceBasisTier() in pricing-tiers.ts, then look up here.

import type { FinishClass, PriceMetric } from './product-config'

// Turn a resolved per-unit RATE into the price for one piece of a given length.
// per_foot multiplies the rate by the cut length in feet; per_piece charges the
// rate as-is (length ignored). Used wherever a line's unit price is finalized so
// panels / hat channel / braces price by the foot and everything else per piece.
export function extendUnitPrice(rate: number, metric: PriceMetric, lengthFt: number): number {
  return metric === 'per_foot' ? rate * lengthFt : rate
}

// ── Per-finish price overrides ───────────────────────────────────────────────
// Keyed for O(1) lookup: `${productId}:${tierKey}:${finishClass}`. tierKey is a
// BASE tier ('retail' | 'contractor').
export const finishPriceKey = (productId: number, tierKey: string, finishClass: FinishClass) =>
  `${productId}:${tierKey}:${finishClass}`

export type FinishPriceMap = Record<string, number>

// Contractor / Retail base-tier price overrides, keyed by product id (blank →
// the product's base price). Same shape used by OrderBuilder + the inventory grid.
export type TierPriceMap = Record<number, { retail?: number; contractor?: number }>

// Resolve the per-item price for a line. `basisTierKey` is a base tier key;
// `finishClass` is null for a line with no/unknown color (falls straight to the
// base price). Prices are the raw per-item numbers — panels still multiply by
// footage at the call site, exactly as before.
export function resolveUnitPrice(opts: {
  productId: number
  basisTierKey: string
  finishClass: FinishClass | null
  finishPrices: FinishPriceMap
  tierPrices: TierPriceMap
  basePrice: number
}): number {
  const { productId, basisTierKey, finishClass, finishPrices, tierPrices, basePrice } = opts
  if (finishClass) {
    const fp = finishPrices[finishPriceKey(productId, basisTierKey, finishClass)]
    if (fp != null) return fp
  }
  const tp =
    basisTierKey === 'contractor' ? tierPrices[productId]?.contractor :
    basisTierKey === 'retail'     ? tierPrices[productId]?.retail :
    undefined
  return tp ?? basePrice
}

// Build the O(1) finish-price map from raw product_finish_prices rows. Accepts a
// plain string finish_class (as it comes back from the DB) and trusts the column
// CHECK constraint to keep it a valid FinishClass.
export function buildFinishPriceMap(
  rows: { product_id: number; tier_key: string; finish_class: string; price: number | string }[] | null | undefined,
): FinishPriceMap {
  const map: FinishPriceMap = {}
  for (const r of rows ?? []) {
    map[finishPriceKey(r.product_id, r.tier_key, r.finish_class as FinishClass)] = Number(r.price)
  }
  return map
}

// ── Finish rows (the `finishes` table) ───────────────────────────────────────
export interface FinishRow {
  id: number
  name: string
  slug: string
  hex: string
  finish_class: FinishClass
  active: boolean
  sort: number
}

// Lowercase, trimmed color NAME → finish id, for stamping order lines with a
// finish_id FK alongside the free-text color. Match mirrors finishClassOf().
export function finishIdByName(finishes: Pick<FinishRow, 'id' | 'name'>[] | null | undefined): Map<string, number> {
  return new Map((finishes ?? []).map((f) => [f.name.trim().toLowerCase(), f.id]))
}

export function finishIdFor(
  byName: Map<string, number>,
  color?: string | null,
): number | null {
  if (!color) return null
  return byName.get(color.trim().toLowerCase()) ?? null
}
