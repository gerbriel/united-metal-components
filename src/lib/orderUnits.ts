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
