import { isWasherScrew } from '@/lib/product-config'

// Every product maps to a procedural 3D archetype. Resolution is SKU-first (most
// specific), then category slug, then a generic crate fallback — so new products
// still get a sensible model even before a bespoke one is added.
export type Archetype =
  | 'square-tube'
  | 'panel'
  | 'skylight'
  | 'trim-l'
  | 'trim-j'
  | 'trim-corner'
  | 'trim-box-eve'
  | 'trim-side-vert'
  | 'trim-flashing'
  | 'ridge-cap'
  | 'hat-channel'
  | 'base-rail'
  | 'brace'
  | 'l-bracket'
  | 'rebar'
  | 'screw'
  | 'screw-bare'
  | 'anchor'
  | 'asphalt-anchor'
  | 'wedge-anchor'
  | 'titen-hd'
  | 'truss'
  | 'window'
  | 'garage-door'
  | 'walkin-door'
  | 'roll'
  | 'moisture-barrier'
  | 'foam-strip'
  | 'foam-male'
  | 'foam-female'
  | 'nipple'
  | 'bundle'
  | 'box'

const BY_SKU: Record<string, Archetype> = {
  'TRIM-L': 'trim-l',
  'TRIM-J': 'trim-j',
  'TRIM-CORNER': 'trim-corner',
  'TRIM-BOX-EVE': 'trim-box-eve',
  'TRIM-SIDE-VERT': 'trim-side-vert',
  'TRIM-FLASHING': 'trim-flashing',
  'RIDGE-CAP': 'ridge-cap',
  'HAT-CHANNEL': 'hat-channel',
  'L-BRACKET': 'l-bracket',
  'FOAM-STRIP': 'foam-strip',
  'FOAM-ENC': 'foam-strip',
  'FOAM-MALE': 'foam-male',
  'FOAM-FEMALE': 'foam-female',
  'REBAR': 'rebar',
  // Asphalt anchor: 30" black barbed rod with the welded rail hook. Mobile-home
  // anchors stay on the generic threaded-rod model via the category fallback.
  'ASPHALT-ANCHOR': 'asphalt-anchor',
  // Concrete anchors: the short one is a Titen HD-style screw anchor, the long one
  // a wedge (expansion) anchor — both Strong-Tie patterns. Swap here if inventory
  // says otherwise.
  'CONC-5-SHORT': 'titen-hd',
  'CONC-7-LONG': 'wedge-anchor',
  'WELD-NIPPLE': 'nipple',
  'BUNDLE-PKG': 'bundle',
  'WALKIN-DOOR': 'walkin-door',
  'TAPE-DBL': 'roll',
  // Inserts are short square-tube nipples that slide inside the tubing.
  'INS-7-2X2': 'square-tube',
  'INS-7-14GA': 'square-tube',
  'INS-1FT': 'square-tube',
}

const BY_CATEGORY: Record<string, Archetype> = {
  'square-tubing': 'square-tube',
  'panels': 'panel',
  'base-rail': 'base-rail',
  'braces': 'brace',
  'rebar': 'rebar',
  'screws': 'screw',
  'anchors': 'anchor',
  'trusses': 'truss',
  'windows': 'window',
  'moisture-barrier': 'moisture-barrier',
  'insulation': 'moisture-barrier',   // legacy slug (pre-rename databases)
  'foam': 'foam-strip',
  'tape': 'roll',
  'welding': 'nipple',
  'bundles': 'bundle',
  'inserts-fasteners': 'square-tube',
  'trim-components': 'trim-l',
}

interface Resolved {
  archetype: Archetype
  // Params passed to the model (e.g. tube gauge/size parsed from the name).
  params: Record<string, number>
}

// Pull the first inch-dimension out of a name/description, e.g. `2.5" 14 GA` → 2.5.
function parseInches(s?: string | null): number | null {
  if (!s) return null
  const m = s.match(/(\d+(?:\.\d+)?)\s*(?:"|inch|in\b)/i)
  return m ? parseFloat(m[1]) : null
}

export function resolveModel(product: {
  sku?: string | null
  name?: string | null
  description?: string | null
  product_categories?: { slug?: string } | null
}): Resolved {
  const sku = product.sku ?? ''
  const slug = product.product_categories?.slug ?? ''

  let archetype: Archetype =
    BY_SKU[sku] ??
    // Roll-up doors are model-prefixed SKUs: GARAGE-* (legacy), MINI650-*, ACERO-*,
    // M2000HO/RD-*, M2500HO/RD-*, M3100RD-* — all Janus-pattern rolling sheet doors.
    (/^(GARAGE|MINI650|ACERO|M2000|M2500|M3100)/.test(sku) ? 'garage-door' : undefined) ??
    // Skylights live in the panels category but are white translucent plastic.
    (sku.startsWith('SKYLIGHT') ? 'skylight' : undefined) ??
    BY_CATEGORY[slug] ??
    // Door category slugs: mini-650-doors, acero-doors, model-2000-doors, …
    (slug.endsWith('-doors') ? 'garage-door' : undefined) ??
    'box'

  // Screws: WITH bonded washer → painted/colored; WITHOUT → bare zinc.
  if (archetype === 'screw') {
    archetype = isWasherScrew(sku, product.name) ? 'screw' : 'screw-bare'
  }

  // Foam closures resolved by category: pick the variant from the product name;
  // an unlabeled foam item shows the mating pair.
  if (archetype === 'foam-strip') {
    const n = (product.name ?? '').toLowerCase()
    if (/\b(male|inside|inner)\b/.test(n)) archetype = 'foam-male'
    else if (/\b(female|outside|outer)\b/.test(n)) archetype = 'foam-female'
  }

  const params: Record<string, number> = {}

  if (archetype === 'square-tube') {
    // Tube face width in inches drives the section size.
    const size = parseInches(product.name) ?? parseInches(product.description) ?? 2.25
    params.size = size
  }
  if (archetype === 'wedge-anchor' || archetype === 'titen-hd') {
    // Anchor length in inches (5" short / 7" long) drives the model proportions.
    params.len = parseInches(product.name) ?? parseInches(product.description) ?? 5
  }
  if (archetype === 'garage-door' || archetype === 'window') {
    // Doors/windows: parse "W x H" (feet for garage, inches for windows).
    // Door heights may carry inches: `650 Mini 6'x6'8"` → 6 wide × 6.67 high.
    const m = (product.name ?? '').match(/(\d+)\s*'?\s*[x×]\s*(\d+)\s*'?\s*(\d+)?/i)
    if (m) {
      params.w = parseFloat(m[1])
      params.h = parseFloat(m[2]) + (m[3] ? parseFloat(m[3]) / 12 : 0)
    }
  }
  return { archetype, params }
}

export type ResolvedModel = Resolved
export type ProductLike = Parameters<typeof resolveModel>[0]
