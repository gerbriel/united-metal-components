import { groupDoorLines, type GridEntry } from '@/lib/doorLines'
import { variantGroupFor, type VariantGroup } from '@/lib/product-config'
import type { ProductLike } from '@/components/product3d/resolve'

// Grid entries after ALL catalog grouping: door model lines collapse to one
// entry per line (doorLines.ts) and variant-group SKUs (tubing gauges, screw
// packages — see VARIANT_GROUPS) collapse to one entry per group.
export type CatalogEntry<T> =
  | GridEntry<T>
  | { kind: 'variants'; group: VariantGroup; products: T[] }

export function groupCatalog<T extends ProductLike>(products: T[]): CatalogEntry<T>[] {
  const entries: CatalogEntry<T>[] = []
  const groups = new Map<string, T[]>()

  for (const e of groupDoorLines(products)) {
    if (e.kind !== 'product') {
      entries.push(e)
      continue
    }
    const group = variantGroupFor(e.product.sku)
    if (!group) {
      entries.push(e)
      continue
    }
    const members = groups.get(group.key)
    if (members) {
      members.push(e.product)
    } else {
      const arr = [e.product]
      groups.set(group.key, arr)
      entries.push({ kind: 'variants', group, products: arr })
    }
  }

  // Order each group's products by the group's member order
  for (const e of entries) {
    if (e.kind !== 'variants') continue
    const order = new Map(e.group.members.map((m, i) => [m.sku, i]))
    e.products.sort(
      (a, b) => (order.get(a.sku ?? '') ?? 99) - (order.get(b.sku ?? '') ?? 99),
    )
  }
  return entries
}
