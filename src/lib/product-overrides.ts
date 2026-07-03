// Front-end display overrides applied to products fetched from Supabase, keyed by
// SKU. Bridges the gap until a migration is pushed: migration 018 splits the foam
// closures into FOAM-MALE / FOAM-FEMALE products; until it lands, the two legacy
// foam items present as the male and female strips. Once the real SKUs replace
// them, these entries stop matching and can be deleted.
interface Override {
  name?: string
  description?: string
  // Display category (badge, breadcrumb, ?cat= filtering) — the DB row keeps its
  // real category_id until the migration moves it.
  product_categories?: { name: string; slug: string }
}

const BY_SKU: Record<string, Override> = {
  'FOAM-ENC': {
    name: 'Foam Closure Strip - Male (Inside)',
    description:
      'Black 2" wide inside foam closure strip, die-cut to the L5 panel profile (fills the ribs from below)',
  },
  'FOAM-STRIP': {
    name: 'Foam Closure Strip - Female (Outside)',
    description:
      'Black 2" wide outside foam closure strip, die-cut to the L5 panel profile (caps over the ribs)',
    product_categories: { name: 'Foam', slug: 'foam' },
  },
}

export function applyProductOverrides<T extends { sku?: string | null }>(product: T): T {
  const o = product.sku ? BY_SKU[product.sku] : undefined
  if (!o) return product
  // Only replace the joined category object if the row actually carried one.
  const { product_categories, ...rest } = o
  const merged: Record<string, unknown> = { ...product, ...rest }
  if (product_categories && 'product_categories' in product) merged.product_categories = product_categories
  return merged as T
}

export function applyAllProductOverrides<T extends { sku?: string | null }>(products: T[]): T[] {
  return products.map(applyProductOverrides)
}
