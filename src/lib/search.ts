// Bilingual (English + Spanish) product search.
// Accent-insensitive, with a domain synonym map so Spanish terms find the right
// products — e.g. "láminas" → sheet-metal panels, "tornillos" → screws.

// Lowercase + strip accents so "láminas" and "laminas" match equally.
export function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

// Each group is a set of interchangeable search terms (EN + ES). Matching any
// term in a group matches text containing any other term in that group.
const SYNONYM_GROUPS: string[][] = [
  ['panel', 'panels', 'lamina', 'laminas', 'paneles', 'sheet metal', 'sheet', 'galvalume', 'overstock', 'skylight', 'tragaluz'],
  ['trim', 'trims', 'moldura', 'molduras', 'remate', 'remates', 'ridge cap', 'caballete', 'eve', 'corner', 'esquina', 'flashing', 'j-trim', 'l-trim'],
  ['tube', 'tubes', 'tubing', 'tubo', 'tubos', 'tuberia', 'square tube', 'insert', 'inserts', 'inserto', 'insertos'],
  ['brace', 'braces', 'bracing', 'refuerzo', 'refuerzos', 'riostra', 'c channel', 'c-channel', 'canal'],
  ['screw', 'screws', 'tornillo', 'tornillos', 'fastener', 'fasteners', 'sujetador', 'sujetadores', 'washer', 'washers', 'arandela'],
  ['anchor', 'anchors', 'ancla', 'anclas', 'anclaje', 'anclajes', 'rebar', 'varilla', 'varillas', 'concrete', 'concreto', 'asphalt', 'asfalto'],
  ['door', 'doors', 'puerta', 'puertas', 'garage', 'garaje', 'cochera', 'walk-in', 'acero'],
  ['window', 'windows', 'ventana', 'ventanas'],
  ['insulation', 'moisture barrier', 'aislamiento', 'aislante', 'barrera', 'humedad', 'bubble', 'burbuja'],
  ['foam', 'espuma', 'closure', 'cierre'],
  ['tape', 'cinta'],
  ['component', 'components', 'componente', 'componentes', 'hat channel', 'bracket', 'soporte'],
  ['bundle', 'bundles', 'paquete', 'kit'],
]

// term -> every related term (union of every group the term appears in).
const RELATED = new Map<string, Set<string>>()
for (const group of SYNONYM_GROUPS) {
  for (const term of group) {
    const key = normalize(term)
    let set = RELATED.get(key)
    if (!set) { set = new Set<string>(); RELATED.set(key, set) }
    for (const g of group) set.add(normalize(g))
  }
}

// Expand a normalized query into itself plus any synonym terms reachable from the
// whole phrase or its tokens (with a light prefix match so "lamin" → "laminas").
function expand(q: string): string[] {
  const out = new Set<string>([q])
  const keys = [q, ...q.split(/\s+/).filter(Boolean)]
  for (const k of keys) {
    RELATED.get(k)?.forEach((t) => out.add(t))
    if (k.length >= 3) {
      for (const [term, set] of RELATED) {
        if (term.startsWith(k) || k.startsWith(term)) set.forEach((t) => out.add(t))
      }
    }
  }
  return [...out].filter((t) => t.length >= 2)
}

// Build a reusable matcher for a query (expand once, then test many products).
export function buildSearchMatcher(rawQuery: string): (text: string) => boolean {
  const q = normalize(rawQuery)
  if (!q) return () => true
  const terms = expand(q)
  return (text: string) => {
    const hay = normalize(text)
    return hay.includes(q) || terms.some((t) => hay.includes(t))
  }
}
