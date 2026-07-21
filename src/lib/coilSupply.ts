// Panel coil supply vs. open-order demand, per color.
//
// Panels are cut from coils and sold by the linear foot. A coil's remaining
// footage is weight / lbs-per-foot. Until a coil is physically weighed we don't
// know its true remaining footage, so we fall back to its initial footage as an
// estimate. This module aggregates, per color:
//   - weighedFeet:      measured remaining footage from coils that were weighed
//   - unweighedEstFeet: initial footage of coils not yet weighed (best estimate)
//   - estOnHandFeet:    weighed + unweighed estimate = total footage we believe
//                       is on the floor
//   - committedFeet:    footage promised to open (unfulfilled) orders
//   - netFeet:          estOnHand - committed → what's free to promise

export const OPEN_ORDER_STATUSES = [
  'pending', 'confirmed', 'processing', 'ready_for_pickup', 'loading',
] as const

export interface SupplyCoil {
  color: string | null
  lbs_per_linear_foot: number
  initial_weight_lbs: number
  current_weight_lbs: number | null
  status: string
  archived: boolean
}

export interface DemandItem {
  item_color: string | null
  linear_feet: number | null
}

export interface ColorSupply {
  color: string
  coilCount: number
  weighedFeet: number
  unweighedEstFeet: number
  estOnHandFeet: number
  committedFeet: number
  netFeet: number
  hasUnweighed: boolean
}

const feet = (weight: number, lbsPerFt: number) => (lbsPerFt > 0 ? weight / lbsPerFt : 0)

function blank(color: string): ColorSupply {
  return {
    color, coilCount: 0, weighedFeet: 0, unweighedEstFeet: 0,
    estOnHandFeet: 0, committedFeet: 0, netFeet: 0, hasUnweighed: false,
  }
}

export function panelSupplyByColor(coils: SupplyCoil[], demand: DemandItem[]): ColorSupply[] {
  const map = new Map<string, ColorSupply>()
  const get = (color: string) => {
    let e = map.get(color)
    if (!e) { e = blank(color); map.set(color, e) }
    return e
  }

  for (const c of coils) {
    if (!c.color || c.archived || c.status === 'depleted') continue
    const e = get(c.color)
    e.coilCount += 1
    if (c.current_weight_lbs != null) {
      e.weighedFeet += feet(c.current_weight_lbs, c.lbs_per_linear_foot)
    } else {
      e.unweighedEstFeet += feet(c.initial_weight_lbs, c.lbs_per_linear_foot)
      e.hasUnweighed = true
    }
  }

  for (const d of demand) {
    if (!d.item_color || !d.linear_feet) continue
    get(d.item_color).committedFeet += Number(d.linear_feet)
  }

  for (const e of map.values()) {
    e.estOnHandFeet = e.weighedFeet + e.unweighedEstFeet
    e.netFeet = e.estOnHandFeet - e.committedFeet
  }

  return Array.from(map.values()).sort((a, b) => a.color.localeCompare(b.color))
}

// ── Purchase-order "on order" flags ──────────────────────────
// PO line items are free text (no structured color / category / footage), so we
// can't total incoming footage. Instead we surface a lightweight flag: is this
// color / pool already sitting on an open PO we're waiting to receive? A line
// counts when its PO is still open, it isn't fully received, and it looks like
// the right coil material — matched by its linked product's category or by
// keywords/color names in the description/notes (the PO form appends the color
// into the description, so panel colors usually match).
export const PO_OPEN_STATUSES = ['draft', 'submitted', 'partial'] as const

export interface OpenPoLine {
  status: string                 // parent PO status
  description: string | null
  notes: string | null
  quantity: number
  quantity_received: number
  coil_category: string | null   // from the linked product, when present
}

export interface PoCoilFlags {
  panelColorsOnOrder: Set<string> // panel colors that appear on an open PO
  hatBraceOnOrder: boolean        // hat channel / brace material on an open PO
}

export function openPoCoilFlags(lines: OpenPoLine[], colorNames: string[]): PoCoilFlags {
  const panelColorsOnOrder = new Set<string>()
  let hatBraceOnOrder = false

  for (const l of lines) {
    if (!(PO_OPEN_STATUSES as readonly string[]).includes(l.status)) continue
    if (Number(l.quantity_received) >= Number(l.quantity)) continue // already received
    const text = `${l.description ?? ''} ${l.notes ?? ''}`.toLowerCase()

    if (l.coil_category === 'panel' || text.includes('panel')) {
      for (const name of colorNames) {
        if (name && text.includes(name.toLowerCase())) panelColorsOnOrder.add(name)
      }
    }
    if (
      l.coil_category === 'hat_channel_brace' ||
      text.includes('hat') || text.includes('brace') ||
      text.includes('c-channel') || text.includes('c channel')
    ) {
      hatBraceOnOrder = true
    }
  }

  return { panelColorsOnOrder, hatBraceOnOrder }
}

// ── Per-order allocation breakdown ───────────────────────────
// Orders commit panel footage by color (not to a specific coil), so allocation
// is aggregated per color and then split by the order that reserved it. Lets
// staff see exactly which open orders are drawing down each color.
export interface AllocationDemand {
  order_id: number
  item_color: string | null
  linear_feet: number | null
  status: string
}

export interface OrderAllocation {
  orderId: number
  status: string
  feet: number
}

export function allocationsByColor(items: AllocationDemand[]): Record<string, OrderAllocation[]> {
  const byColor: Record<string, Map<number, OrderAllocation>> = {}
  for (const it of items) {
    if (!it.item_color || !it.linear_feet) continue
    const perOrder = (byColor[it.item_color] ??= new Map())
    const existing = perOrder.get(it.order_id)
    if (existing) existing.feet += Number(it.linear_feet)
    else perOrder.set(it.order_id, { orderId: it.order_id, status: it.status, feet: Number(it.linear_feet) })
  }
  const out: Record<string, OrderAllocation[]> = {}
  for (const [color, perOrder] of Object.entries(byColor)) {
    out[color] = [...perOrder.values()].sort((a, b) => b.feet - a.feet)
  }
  return out
}

export interface PoolSupply {
  coilCount: number
  weighedFeet: number
  unweighedEstFeet: number
  estOnHandFeet: number
  committedFeet: number
  netFeet: number
  hasUnweighed: boolean
}

// Hat channel and braces are cut from a single colorless coil pool (coil_category
// = 'hat_channel_brace') and share their supply. Aggregate all non-archived coils
// into one estimate and net out footage committed to open orders. `committedFeet`
// is the combined hat-channel + brace demand, since both draw from this pool.
export function pooledSupply(coils: SupplyCoil[], committedFeet: number): PoolSupply {
  let coilCount = 0
  let weighedFeet = 0
  let unweighedEstFeet = 0
  let hasUnweighed = false

  for (const c of coils) {
    if (c.archived || c.status === 'depleted') continue
    coilCount += 1
    if (c.current_weight_lbs != null) {
      weighedFeet += feet(c.current_weight_lbs, c.lbs_per_linear_foot)
    } else {
      unweighedEstFeet += feet(c.initial_weight_lbs, c.lbs_per_linear_foot)
      hasUnweighed = true
    }
  }

  const estOnHandFeet = weighedFeet + unweighedEstFeet
  return {
    coilCount, weighedFeet, unweighedEstFeet, estOnHandFeet,
    committedFeet, netFeet: estOnHandFeet - committedFeet, hasUnweighed,
  }
}

export interface OrderDemandItem extends DemandItem {
  order_id: number
}

// ── Per-order trim availability ──────────────────────────────
// Trim is deliberately OUTSIDE the panel coil-footage math (migration 058): it
// is tracked as per-(product, finish) piece counts in trim_stock. Order lines
// for trim carry finish_id + quantity but no linear_feet, so the coil checks
// above never see them — this is the piece-count counterpart used alongside
// orderColorAvailability on the order review page.
export interface TrimStockLevel {
  product_id: number
  finish_id: number
  qty: number
}

export interface TrimDemandItem {
  order_id: number
  product_id: number | null
  finish_id: number | null
  quantity: number
}

export interface OrderTrimCheck {
  productId: number
  finishId: number
  neededPieces: number    // this order's demand for the (product, finish)
  onHandPieces: number    // trim_stock qty (no row = 0)
  committedOthers: number // pieces promised to OTHER open orders
  availablePieces: number // onHand - committedOthers (free before this order)
  enough: boolean
}

export function orderTrimAvailability(
  stock: TrimStockLevel[],
  allOpenDemand: TrimDemandItem[],
  orderId: number,
): OrderTrimCheck[] {
  const key = (p: number, f: number) => `${p}:${f}`
  const onHand = new Map<string, number>()
  for (const s of stock) onHand.set(key(s.product_id, s.finish_id), Number(s.qty))

  const needed = new Map<string, { productId: number; finishId: number; pieces: number }>()
  const committedOthers = new Map<string, number>()
  for (const d of allOpenDemand) {
    if (d.product_id == null || d.finish_id == null) continue
    const k = key(d.product_id, d.finish_id)
    if (d.order_id === orderId) {
      const e = needed.get(k) ?? { productId: d.product_id, finishId: d.finish_id, pieces: 0 }
      e.pieces += Number(d.quantity)
      needed.set(k, e)
    } else {
      committedOthers.set(k, (committedOthers.get(k) ?? 0) + Number(d.quantity))
    }
  }

  return Array.from(needed.entries())
    .map(([k, e]) => {
      const others = committedOthers.get(k) ?? 0
      const onHandPieces = onHand.get(k) ?? 0
      const availablePieces = onHandPieces - others
      return {
        productId: e.productId,
        finishId: e.finishId,
        neededPieces: e.pieces,
        onHandPieces,
        committedOthers: others,
        availablePieces,
        enough: availablePieces >= e.pieces,
      }
    })
    .sort((a, b) => a.productId - b.productId || a.finishId - b.finishId)
}

export interface OrderColorCheck {
  color: string
  neededFeet: number     // this order's demand for the color
  onHandFeet: number     // estimated footage on the floor for the color
  committedOthers: number // footage promised to OTHER open orders
  availableFeet: number  // onHand - committedOthers (free before this order)
  enough: boolean        // availableFeet >= neededFeet
  hasUnweighed: boolean  // estimate leans on unweighed coils
}

// For a single order, check per-color whether enough panel footage is free once
// every OTHER open order is accounted for. Useful before accepting an order.
export function orderColorAvailability(
  coils: SupplyCoil[],
  allOpenDemand: OrderDemandItem[],
  orderId: number,
): OrderColorCheck[] {
  const supply = panelSupplyByColor(coils, [])
  const supplyByColor = new Map(supply.map((s) => [s.color, s]))

  const needed = new Map<string, number>()
  const committedOthers = new Map<string, number>()
  for (const d of allOpenDemand) {
    if (!d.item_color || !d.linear_feet) continue
    if (d.order_id === orderId) {
      needed.set(d.item_color, (needed.get(d.item_color) ?? 0) + Number(d.linear_feet))
    } else {
      committedOthers.set(d.item_color, (committedOthers.get(d.item_color) ?? 0) + Number(d.linear_feet))
    }
  }

  return Array.from(needed.entries())
    .map(([color, neededFeet]) => {
      const s = supplyByColor.get(color)
      const onHandFeet = s?.estOnHandFeet ?? 0
      const others = committedOthers.get(color) ?? 0
      const availableFeet = onHandFeet - others
      return {
        color,
        neededFeet,
        onHandFeet,
        committedOthers: others,
        availableFeet,
        enough: availableFeet >= neededFeet,
        hasUnweighed: s?.hasUnweighed ?? false,
      }
    })
    .sort((a, b) => a.color.localeCompare(b.color))
}
