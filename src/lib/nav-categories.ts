import {
  // Panels & sheet
  Layers, PanelTop, PanelsTopLeft, Rows2, Rows3, SquareStack, StretchHorizontal,
  // Trim & profiles
  Frame, Ruler, Slice, PenTool, Spline,
  // Tubing
  Box, Cuboid, Cylinder, RectangleHorizontal,
  // Doors & windows
  DoorOpen, DoorClosed, AppWindow, Blinds,
  // Fasteners & hardware
  Bolt, Nut, Wrench, Hammer, Cog, Settings, Anchor,
  // Bracing & structural
  Grid2x2, Triangle, Fence,
  // Components & accessories
  Component, Puzzle, Boxes, Package, PackageOpen, Container, Grip,
  // Moisture barrier & weatherproofing
  Droplets, Umbrella, ShieldCheck, Shield, Waves, CloudRain,
  // Logistics & misc
  Warehouse, Truck,
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

// Ordered by theme so the admin picker groups sensibly (CATEGORY_ICON_NAMES
// keeps this order). Suggested fits: panels → Layers / PanelTop / Rows3;
// moisture barrier → Droplets / Umbrella / ShieldCheck; components → Component /
// Boxes / Puzzle.
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  // Panels & sheet
  Layers, PanelTop, PanelsTopLeft, Rows2, Rows3, SquareStack, StretchHorizontal,
  // Trim & profiles
  Frame, Ruler, Slice, PenTool, Spline,
  // Tubing
  Box, Cuboid, Cylinder, RectangleHorizontal,
  // Doors & windows
  DoorOpen, DoorClosed, AppWindow, Blinds,
  // Fasteners & hardware
  Bolt, Nut, Wrench, Hammer, Cog, Settings, Anchor,
  // Bracing & structural
  Grid2x2, Triangle, Fence,
  // Components & accessories
  Component, Puzzle, Boxes, Package, PackageOpen, Container, Grip,
  // Moisture barrier & weatherproofing
  Droplets, Umbrella, ShieldCheck, Shield, Waves, CloudRain,
  // Logistics & misc
  Warehouse, Truck,
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
