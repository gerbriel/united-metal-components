import type { CSSProperties } from 'react'

// Finish class = the pricing bucket a color belongs to. Mirrors finishes.finish_class
// (migration 055): galvalume (bare metal, cheapest), solid (painted, base price),
// pattern (printed Dark Stone / Light Rock, premium). Drives per-color pricing.
export type FinishClass = 'galvalume' | 'solid' | 'pattern'

// How a product's price is metered (products.price_metric, migration 060):
//   per_foot  → charge the rate × cut length (ft) — panels, hat channel, braces
//   per_piece → charge the rate once per piece — everything else
export type PriceMetric = 'per_foot' | 'per_piece'

type ColorEntry = {
  name: string
  hex: string
  textDark: boolean
  finishClass: FinishClass
  // Optional CSS background (e.g. a gradient) for the swatch preview ONLY — used
  // to fake the sheen of a bare metallic finish. The 3D viewer always renders
  // from `hex` (see product3d/geom.ts), so keep `hex` representative too.
  gradient?: string
  // Stone-look finishes are a PRINTED PATTERN, not a solid color: the artwork is
  // printed on the flat coil and then roll-formed, so it flows over the ribs. When
  // set, the 3D panel renders this image as a texture map (see product3d/geom.ts →
  // colorTexture / developedPanelUV) instead of the flat `hex`. Path is public/-
  // relative (served at the site root). `hex` stays the swatch color + fallback.
  texture?: string
}

// Hex values are tuned to read true-to-life on the storefront swatches and drive
// the 3D finish. Galvalume is bare metal, so it also gets a brushed-metal sheen
// gradient on its swatch.
export const COLORS: ColorEntry[] = [
  { name: 'White',         hex: '#F0F0EA', textDark: true,  finishClass: 'solid'     },
  { name: 'Light Stone',   hex: '#CFC6AF', textDark: true,  finishClass: 'solid'     },
  { name: 'Pebble Beige',  hex: '#D0BE97', textDark: true,  finishClass: 'solid'     },
  { name: 'Mocha Tan',     hex: '#A5825A', textDark: true,  finishClass: 'solid'     },
  { name: 'Taupe',         hex: '#877564', textDark: true,  finishClass: 'solid'     },
  { name: 'Clay',          hex: '#A96C46', textDark: true,  finishClass: 'solid'     },
  { name: 'Brown',         hex: '#4A3223', textDark: false, finishClass: 'solid'     },
  { name: 'Zinc Gray',     hex: '#6C7176', textDark: false, finishClass: 'solid'     },
  { name: 'Pewter Gray',   hex: '#93938D', textDark: true,  finishClass: 'solid'     },
  { name: 'Galvalume',     hex: '#C6C8C5', textDark: true,  finishClass: 'galvalume',
    gradient: 'linear-gradient(135deg, #E2E4E0 0%, #BFC2BE 42%, #D6D8D4 52%, #AEB1AD 100%)' },
  { name: 'Hawaiian Blue', hex: '#3670C0', textDark: false, finishClass: 'solid'     },
  { name: 'Forest Green',  hex: '#2C4E27', textDark: false, finishClass: 'solid'     },
  { name: 'Barn Red',      hex: '#7C2A24', textDark: false, finishClass: 'solid'     },
  { name: 'Black',         hex: '#1C1C1C', textDark: false, finishClass: 'solid'     },
  { name: 'Light Rock',    hex: '#9E9384', textDark: true,  finishClass: 'pattern',  texture: '/textures/light-rock.jpg' },
  { name: 'Dark Stone',    hex: '#4E453E', textDark: false, finishClass: 'pattern',  texture: '/textures/dark-stone.jpg' },
]

// Color NAME → finish class, mirroring the seeded `finishes` table. An unknown or
// empty name (legacy strings, "no color") returns null → the caller falls back to
// the product's base price. Match is case-insensitive and trimmed, like the
// migration-056 finish_id backfill.
const FINISH_CLASS_BY_NAME = new Map<string, FinishClass>(
  COLORS.map((c) => [c.name.toLowerCase(), c.finishClass]),
)
export function finishClassOf(name?: string | null): FinishClass | null {
  if (!name) return null
  return FINISH_CLASS_BY_NAME.get(name.trim().toLowerCase()) ?? null
}

export type ColorName = string

// Inline style for a color swatch chip. A printed finish (Light Rock, Dark Stone)
// shows its texture photo; a metallic finish shows its gradient; everything else is
// the flat hex. `null`/undefined (the "no color" chip) falls back to a neutral gray.
// Used by every color picker so panels and trim render swatches the same way.
export function swatchStyle(
  color?: Pick<ColorEntry, 'hex' | 'gradient' | 'texture'> | null,
): CSSProperties {
  if (!color) return { backgroundColor: '#e2e8f0' }
  if (color.texture) {
    return { backgroundImage: `url(${color.texture})`, backgroundSize: 'cover', backgroundPosition: 'center' }
  }
  if (color.gradient) return { backgroundImage: color.gradient }
  return { backgroundColor: color.hex }
}

// Roofing screws come in two variants:
//  • WITH a bonded EPDM sealing washer → painted hex head + colored rubber washer,
//    offered in the same finish colors as the panels (the COLORS palette above).
//  • WITHOUT a washer → plain bare-zinc hex-washer-head screw, no color.
// Detect the variant from the SKU / product name (handles "w/", "w/o", "with",
// "without", "painted", "color"). Returns true only for the washered/colored kind.
export function isScrewProduct(sku?: string | null, name?: string | null): boolean {
  const s = `${sku ?? ''} ${name ?? ''}`.toLowerCase()
  return /screw/.test(s)
}
export function isWasherScrew(sku?: string | null, name?: string | null): boolean {
  if (!isScrewProduct(sku, name)) return false
  const s = `${sku ?? ''} ${name ?? ''}`.toLowerCase()
  if (/without|w\/o|\bwo\b|no washer/.test(s)) return false   // bare (no washer)
  return /washer|w\/|with|paint|colou?r/.test(s)              // washered / colored
}

// ── Variant groups ─────────────────────────────────────────────
// Several SKUs presented as ONE storefront product with a dropdown — the same
// treatment door model lines get. The grid shows one card per group; the
// product page shows a selector that navigates between the member products.
export interface VariantMember {
  sku: string
  label: string     // dropdown option text, e.g. '2.5" × 2.5"' or 'Box (3,000 ct)'
  section?: string  // optional dropdown section heading, e.g. 'Scrap'
}

export interface VariantGroup {
  key: string
  name: string        // card / product-page title, e.g. '14 GA Square Tubing'
  selectLabel: string // dropdown label: 'Size', 'Package', …
  colors?: boolean    // force the color picker on (true) or off (false) for all members
  members: VariantMember[] // display order; the first member present is the default
}

export const VARIANT_GROUPS: VariantGroup[] = [
  {
    key: 'tube-14ga',
    name: '14 GA Square Tubing',
    selectLabel: 'Size',
    members: [
      { sku: 'TUBE-2.5-14GA',        label: '2.5" × 2.5"' },
      { sku: 'TUBE-2.25-14GA',       label: '2.25" × 2.25"' },
      { sku: 'TUBE-2.0-14GA',        label: '2" × 2"' },
      { sku: 'TUBE-2.5-14GA-SCRAP',  label: '2.5" × 2.5"',   section: 'Scrap' },
      { sku: 'TUBE-2.25-14GA-SCRAP', label: '2.25" × 2.25"', section: 'Scrap' },
      { sku: 'TUBE-2.0-14GA-SCRAP',  label: '2" × 2"',       section: 'Scrap' },
    ],
  },
  {
    key: 'tube-12ga',
    name: '12 GA Square Tubing',
    selectLabel: 'Size',
    members: [
      { sku: 'TUBE-2.25-12GA',       label: '2.25" × 2.25"' },
      { sku: 'TUBE-2.25-12GA-SCRAP', label: '2.25" × 2.25"', section: 'Scrap' },
    ],
  },
  {
    key: 'screws-washers',
    name: 'Screws w/ Washers',
    selectLabel: 'Package',
    colors: false, // bare-zinc washer-head screws — colored is its own product below
    members: [
      { sku: 'SCREWS-BOX-W',   label: 'Box (3,000 ct)' },
      { sku: 'SCREWS-BOX-125', label: 'Box (125 ct)' },
      { sku: 'SCREWS-BAG-W',   label: 'Bag (250 ct)' },
    ],
  },
  {
    key: 'screws-no-washers',
    name: 'Screws w/o Washers',
    selectLabel: 'Package',
    colors: false, // bare-zinc screws — no color choice
    members: [
      { sku: 'SCREWS-BOX-WO', label: 'Box (3,000 ct)' },
      { sku: 'SCREWS-BAG-WO', label: 'Bag (250 ct)' },
    ],
  },
  {
    key: 'colored-screws',
    name: 'Colored Screws',
    selectLabel: 'Package',
    colors: true, // painted to match panel color (washer-head); pick the color
    members: [
      { sku: 'SCREWS-BOX-W-PAINTED', label: 'Box' },
      { sku: 'SCREWS-BAG-W-PAINTED', label: 'Bag' },
    ],
  },
  {
    key: 'concrete-anchors',
    name: 'Concrete Anchors',
    selectLabel: 'Size',
    members: [
      { sku: 'CONC-5-SHORT', label: '5" Short' },
      { sku: 'CONC-7-LONG',  label: '7" Long' },
    ],
  },
  {
    key: 'mobile-home-anchors',
    name: 'Mobile Home Anchors',
    selectLabel: 'Option',
    members: [
      { sku: 'MHA',       label: 'Anchor' },
      { sku: 'MHA-BOLTS', label: 'Bolts' },
    ],
  },
]

const GROUP_BY_SKU = new Map<string, VariantGroup>()
for (const g of VARIANT_GROUPS) for (const m of g.members) GROUP_BY_SKU.set(m.sku, g)

export function variantGroupFor(sku?: string | null): VariantGroup | undefined {
  return sku ? GROUP_BY_SKU.get(sku) : undefined
}

export function variantLabel(group: VariantGroup, sku?: string | null): string | undefined {
  return group.members.find((m) => m.sku === sku)?.label
}

export type TubingConfig =
  | { type: 'preset'; lengths: number[] }
  | { type: 'special-order' }

// Per-foot products sold by the piece with preset length options
export const TUBING_CONFIG: Record<string, TubingConfig> = {
  'TUBE-2.5-14GA':  { type: 'preset', lengths: [20, 22, 24, 26, 32] },
  'TUBE-2.25-14GA': { type: 'preset', lengths: [20, 32] },
  'TUBE-2.25-12GA': { type: 'special-order' },
}

// Panel presets (all customers); contractors can also enter a custom length
export const PANEL_LENGTHS = [16, 21, 26, 31]

// Hat channel and brace presets
export const HAT_CHANNEL_LENGTHS = [2, 3, 16, 21, 26, 31]
export const BRACE_LENGTHS = [2, 3]

// Overstock panels are discrete pre-made pieces tracked in panel_overstock
// (migration 032). Their color/length options come from live inventory rows, not
// the coil linear-foot flow or the full palette — so this SKU is deliberately
// kept OUT of PANEL_SKUS and COLOR_SKUS below and handled by its own branch on
// the product page / order form.
// Keep entries UPPERCASE. SKUs are admin-editable (a staffer can retype the
// casing in the product editor), so match case-insensitively — otherwise the
// storefront overstock branch and the dashboard manager silently stop matching.
export const OVERSTOCK_SKUS = new Set(['PANEL-29GA-OVERSTOCK'])

export function isOverstockSku(sku?: string | null): boolean {
  return !!sku && OVERSTOCK_SKUS.has(sku.toUpperCase())
}

// SKUs that get a length selector (per-foot products sold by piece).
// Galvalume and Stone are no longer standalone panels — they're color choices on
// PANEL-29GA (see migration 022), so they're not listed here.
export const PANEL_SKUS = new Set(['PANEL-29GA'])

// SKUs that support color selection
export const COLOR_SKUS = new Set([
  'PANEL-29GA',
  'TRIM-BOX-EVE',
  'TRIM-CORNER',
  'TRIM-FLASHING',
  'TRIM-J',
  'TRIM-L',
  'TRIM-SIDE-VERT',
  'RIDGE-CAP',
  'HAT-CHANNEL',
])

// Trim SKUs: colorable, per-PIECE flashing/cap pieces cut from the same painted
// coils as panels. Their per-color stock lives in trim_stock (migration 058),
// tracked as discrete piece counts per (product, finish) — NOT coil footage.
// Keep UPPERCASE; SKUs are admin-editable, so match case-insensitively (like
// OVERSTOCK_SKUS). RIDGE-CAP is included; HAT-CHANNEL/PANEL are per-foot, not here.
export const TRIM_SKUS = new Set([
  'TRIM-BOX-EVE',
  'TRIM-CORNER',
  'TRIM-FLASHING',
  'TRIM-J',
  'TRIM-L',
  'TRIM-SIDE-VERT',
  'RIDGE-CAP',
])

export function isTrimSku(sku?: string | null): boolean {
  return !!sku && TRIM_SKUS.has(sku.toUpperCase())
}

// A product that can't be meaningfully added to the cart straight from a grid
// card because it first needs a color, a cut length, or a specific in-stock
// piece — the storefront card links to the product page ("Select options")
// instead of an Add button. Derived from the same tables the product page and
// order form use, so the grid and the detail page never disagree.
//
// Variant-group members (tubing sizes, screw packages) return false: those get
// a VariantGroupCard/DoorLineCard whose in-card dropdown covers the choice, so
// they keep their Add button (see ProductGrid's grouping).
export function requiresConfiguration(sku?: string | null, name?: string | null): boolean {
  const s = sku ?? ''
  if (variantGroupFor(s)) return false
  if (isOverstockSku(s)) return true                                  // pick a specific piece
  if (COLOR_SKUS.has(s) || isWasherScrew(s, name)) return true        // needs a color
  // needs a cut length
  if (PANEL_SKUS.has(s) || s === 'HAT-CHANNEL' || s === 'BRACE' || TUBING_CONFIG[s]?.type === 'preset') return true
  return false
}

// A VariantGroupCard's in-card dropdown only covers the size/package choice — it
// can't supply a cut length or a color. So a group whose members still need one
// of those (tubing = cut length; colored screws = color) must route to the
// product page ("Select options") instead of a one-click Add, exactly like the
// non-grouped configurable products above.
export function variantGroupNeedsConfiguration(group: VariantGroup): boolean {
  if (group.colors) return true                                        // needs a color
  return group.members.some((m) => {
    const t = TUBING_CONFIG[m.sku]
    return t?.type === 'preset' || t?.type === 'special-order'         // needs a cut length / call-in
  })
}
