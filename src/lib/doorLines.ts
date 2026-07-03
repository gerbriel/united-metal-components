import { resolveModel, type ProductLike } from '@/components/product3d/resolve'

// Roll-up doors come in ~160 size SKUs across 7 model lines (Acero, 650 Mini,
// Model 2000/2500 HO/RD, Model 3100 RD). The catalog shows one card per line
// with a size dropdown instead of a card (and 3D canvas) per size. Only the
// common sizes below drive a 3D render — every other size is order-only.

// Width × height, feet.
export const COMMON_DOOR_SIZES: ReadonlyArray<readonly [number, number]> = [
  [6, 6], [8, 8], [10, 10], [10, 12], [12, 10], [12, 12], [14, 14],
]

// Same size token the 3D resolver parses: `8'x8'`, `6'x6'8"` (feet + inches).
const SIZE_RE = /(\d+)\s*'?\s*[x×]\s*(\d+)\s*'?\s*(\d+)?\s*"?/i

export interface DoorSize {
  w: number
  h: number
  label: string // the size token as written in the product name, e.g. `6'x6'8"`
}

export function parseDoorSize(name?: string | null): DoorSize | null {
  const m = (name ?? '').match(SIZE_RE)
  if (!m) return null
  return {
    w: parseFloat(m[1]),
    h: parseFloat(m[2]) + (m[3] ? parseFloat(m[3]) / 12 : 0),
    label: m[0].trim(),
  }
}

function commonIndex(size: DoorSize | null): number {
  if (!size) return -1
  return COMMON_DOOR_SIZES.findIndex(([w, h]) => size.w === w && size.h === h)
}

export function isCommonDoorSize(name?: string | null): boolean {
  return commonIndex(parseDoorSize(name)) !== -1
}

export function isRollupDoor(product: ProductLike): boolean {
  return resolveModel(product).archetype === 'garage-door'
}

// `Acero 8'x8' Door` → `Acero Door`; `Model 2500 RD 8'x12'` → `Model 2500 RD`
export function doorLineName(name?: string | null): string {
  return (name ?? '').replace(SIZE_RE, '').replace(/\s{2,}/g, ' ').trim()
}

// Model line = SKU prefix (ACERO-8X8 → ACERO); sizes of one line share it.
export function doorLineKey(product: { sku?: string | null; name?: string | null }): string {
  const prefix = (product.sku ?? '').split('-')[0]
  return prefix || doorLineName(product.name)
}

// Common sizes first (in COMMON_DOOR_SIZES order), then the rest by width/height.
export function sortDoorProducts<T extends ProductLike>(products: T[]): T[] {
  const rank = (p: T) => {
    const s = parseDoorSize(p.name)
    const ci = commonIndex(s)
    return { ci: ci === -1 ? COMMON_DOOR_SIZES.length : ci, w: s?.w ?? 99, h: s?.h ?? 99 }
  }
  return [...products].sort((a, b) => {
    const ra = rank(a), rb = rank(b)
    return ra.ci - rb.ci || ra.w - rb.w || ra.h - rb.h
  })
}

export type GridEntry<T> =
  | { kind: 'product'; product: T }
  | { kind: 'doorLine'; key: string; products: T[] }

// Collapse door products into one entry per model line, keeping each line at the
// position of its first product; everything else passes through untouched.
export function groupDoorLines<T extends ProductLike>(products: T[]): GridEntry<T>[] {
  const entries: GridEntry<T>[] = []
  const lines = new Map<string, T[]>()
  for (const p of products) {
    if (!isRollupDoor(p)) {
      entries.push({ kind: 'product', product: p })
      continue
    }
    const key = doorLineKey(p)
    const line = lines.get(key)
    if (line) {
      line.push(p)
    } else {
      const arr = [p]
      lines.set(key, arr)
      entries.push({ kind: 'doorLine', key, products: arr })
    }
  }
  for (const e of entries) {
    if (e.kind === 'doorLine') e.products = sortDoorProducts(e.products)
  }
  return entries
}
