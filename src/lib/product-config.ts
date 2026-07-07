type ColorEntry = {
  name: string
  hex: string
  textDark: boolean
  // Optional: path to a texture photo in /public for patterned finishes.
  // Place images at public/images/colors/<filename>.jpg
  image?: string
}

export const COLORS: ColorEntry[] = [
  { name: 'White',         hex: '#F5F5F5', textDark: true  },
  { name: 'Light Stone',   hex: '#C8B896', textDark: true,  image: '/images/colors/light-stone.jpg'  },
  { name: 'Pebble Beige',  hex: '#D4BF9A', textDark: true  },
  { name: 'Mocha Tan',     hex: '#A88660', textDark: true  },
  { name: 'Taupe',         hex: '#8F7E6E', textDark: true  },
  { name: 'Clay',          hex: '#B5724A', textDark: true  },
  { name: 'Brown',         hex: '#5C3A1E', textDark: false },
  { name: 'Zinc Gray',     hex: '#686868', textDark: false },
  { name: 'Pewter Gray',   hex: '#969696', textDark: true  },
  { name: 'Galvalume',     hex: '#C8C8C0', textDark: true,  image: '/images/colors/galvalume.jpg'    },
  { name: 'Hawaiian Blue', hex: '#3A74C4', textDark: false },
  { name: 'Forest Green',  hex: '#2A5024', textDark: false },
  { name: 'Barn Red',      hex: '#7A2020', textDark: false },
  { name: 'Black',         hex: '#1A1A1A', textDark: false },
  { name: 'Light Rock',    hex: '#A09080', textDark: false },
  { name: 'Dark Stone',    hex: '#504540', textDark: false, image: '/images/colors/dark-stone.jpg'   },
]

export type ColorName = string

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
    colors: true, // washered screws are painted to match panel colors
    members: [
      { sku: 'SCREWS-BOX-W',         label: 'Box (3,000 ct)' },
      { sku: 'SCREWS-BAG-W',         label: 'Bag (250 ct)' },
      { sku: 'SCREWS-BOX-125',       label: 'Box (125 ct)' },
      { sku: 'SCREWS-BOX-W-PAINTED', label: '1½" Painted — Box' },
      { sku: 'SCREWS-BAG-W-PAINTED', label: '1½" Painted — Bag' },
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

// SKUs that get a length selector (per-foot products sold by piece).
// Galvalume and Stone are no longer standalone panels — they're color choices on
// PANEL-29GA (see migration 022), so they're not listed here.
export const PANEL_SKUS = new Set(['PANEL-29GA', 'PANEL-29GA-SCRAP'])

// SKUs that support color selection
export const COLOR_SKUS = new Set([
  'PANEL-29GA',
  'PANEL-29GA-SCRAP',
  'TRIM-BOX-EVE',
  'TRIM-CORNER',
  'TRIM-FLASHING',
  'TRIM-J',
  'TRIM-L',
  'TRIM-SIDE-VERT',
  'RIDGE-CAP',
  'HAT-CHANNEL',
])
