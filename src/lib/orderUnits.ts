// Formats an order line's quantity for display.
//
// Cut/length products (panels, hat channel, braces) are ordered as a number of
// pieces at a chosen cut length — their `quantity` is a piece count, NOT a
// measure in the product's `unit` (which is "Foot" for pricing purposes). For
// those, show the piece count plus the total linear footage. Everything else is
// a straightforward count in the product's own unit (e.g. "3 Box", "12 Each").
export function formatOrderQty(opts: {
  quantity: number
  unit?: string | null
  lengthFeet?: number | null
  linearFeet?: number | null
}): string {
  const { quantity, unit, lengthFeet, linearFeet } = opts

  if (lengthFeet != null) {
    const pieces = `${quantity} ${quantity === 1 ? 'piece' : 'pieces'}`
    if (linearFeet != null) {
      const ft = Number(linearFeet).toLocaleString(undefined, { maximumFractionDigits: 2 })
      return `${pieces} · ${ft} linear ft`
    }
    return pieces
  }

  return `${quantity}${unit ? ` ${unit}` : ''}`
}

// Splits an order line's quantity into two independent display values for tables
// that give pieces and linear footage their own columns. For cut products the
// piece count is a bare number (the column header supplies "Pieces") and the
// footage is formatted with a "ft" suffix; for per-unit products the count
// carries its own unit and there is no footage.
export function orderQtyParts(opts: {
  quantity: number
  unit?: string | null
  lengthFeet?: number | null
  linearFeet?: number | null
}): { pieces: string; linearFeet: string | null } {
  const { quantity, unit, lengthFeet, linearFeet } = opts

  if (lengthFeet != null) {
    return {
      pieces: `${quantity}`,
      linearFeet: linearFeet != null
        ? `${Number(linearFeet).toLocaleString(undefined, { maximumFractionDigits: 2 })} ft`
        : null,
    }
  }

  return { pieces: `${quantity}${unit ? ` ${unit}` : ''}`, linearFeet: null }
}
