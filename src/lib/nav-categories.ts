import {
  Layers, Frame, Box, DoorOpen, Component, Bolt, Grid2x2,
  Package, Wrench, Anchor, Droplets, Warehouse, Ruler, Hammer,
  PanelsTopLeft, Truck, SquareStack, Blinds, Fence, Cuboid,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// ── Storefront navigation taxonomy ─────────────────────────────────────────
// The customer-facing product buckets now live in the DATABASE
// (product_categories: slug, name, description, icon, sort_order, nav_visible)
// and are managed from the dashboard (Categories). The header category bar,
// homepage cards, footer, and /products sidebar all read from there — no code
// edit or redeploy to add/rename/reorder/hide a category.
//
// Icons can't live in a DB column as React components, so the category stores an
// icon NAME and we map it to a lucide component here. CATEGORY_ICONS is also the
// palette the admin icon picker offers.

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Layers, Frame, Box, DoorOpen, Component, Bolt, Grid2x2,
  Package, Wrench, Anchor, Droplets, Warehouse, Ruler, Hammer,
  PanelsTopLeft, Truck, SquareStack, Blinds, Fence, Cuboid,
}

// Icon names offered in the admin picker (stable order).
export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS)

// Resolve a stored icon name to a component, with a sensible fallback.
export function iconFor(name?: string | null): LucideIcon {
  return (name ? CATEGORY_ICONS[name] : undefined) ?? Package
}

// Shape the storefront nav consumes (a subset of a product_categories row).
export interface NavCategory {
  slug: string
  name: string
  description: string | null
  icon: string | null
  sort_order: number
}
