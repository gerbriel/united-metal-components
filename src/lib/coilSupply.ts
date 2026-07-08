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

export interface OrderDemandItem extends DemandItem {
  order_id: number
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
