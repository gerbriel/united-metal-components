import { Layers, Frame, Box, DoorOpen, Component, Bolt, Grid2x2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// ── Storefront navigation taxonomy ─────────────────────────────────────────
// Single source of truth for the six/seven customer-facing product buckets.
// Consumed by the header menu, the homepage category cards, the footer, and the
// /products sidebar so every surface agrees. The `slug` matches the DB
// product_categories.slug after migration 029 (re-categorize catalog); the
// /products page filters on `?cat=<slug>`.
export interface NavCategory {
  slug: string
  label: string
  desc: string
  Icon: LucideIcon
}

export const NAV_CATEGORIES: NavCategory[] = [
  { slug: 'panels',        label: 'Panels',          desc: '29 GA painted, galvalume & overstock', Icon: Layers    },
  { slug: 'trim',          label: 'Trim',            desc: 'Eve, corner, J/L, ridge cap & flashing', Icon: Frame   },
  { slug: 'tubing',        label: 'Tubing',          desc: '12 & 14 GA square tubing',             Icon: Box       },
  { slug: 'doors-windows', label: 'Doors & Windows', desc: 'Garage, walk-in doors & windows',      Icon: DoorOpen  },
  { slug: 'components',    label: 'Components',      desc: 'Hat channel, foam, moisture barrier & more', Icon: Component },
  { slug: 'fasteners',     label: 'Fasteners',       desc: 'Screws, inserts & anchors',            Icon: Bolt      },
  { slug: 'bracing',       label: 'Bracing',         desc: 'Structural cross braces',              Icon: Grid2x2   },
]

// Rank a category slug by its position in the canonical order above (unknowns
// sort last). Lets DB-driven surfaces present the buckets in the intended order
// rather than alphabetically.
export function navCategoryRank(slug?: string | null): number {
  const i = NAV_CATEGORIES.findIndex((c) => c.slug === slug)
  return i === -1 ? NAV_CATEGORIES.length : i
}
