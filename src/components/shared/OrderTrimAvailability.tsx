import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, AlertTriangle } from 'lucide-react'
import { swatchStyle } from '@/lib/product-config'
import type { OrderTrimCheck } from '@/lib/coilSupply'

export interface TrimCheckDisplay extends OrderTrimCheck {
  productName: string
  finishName: string
  finishHex: string | null
  finishGradient: string | null
  finishTexture: string | null
}

// A trim line on this order with no finish_id stamped (legacy data or a
// finish that was since removed) — it can't be checked against stock, so it
// must read as needing attention, never as part of an all-clear.
export interface UncheckedTrimLine {
  productName: string
  itemColor: string | null
  pieces: number
}

// Server component: per-(trim product, finish) piece availability for a single
// order. Trim is piece-counted in trim_stock (migration 058), outside the panel
// coil footage math, so it gets its own check next to OrderCoilAvailability.
export default function OrderTrimAvailability(
  { checks, unchecked = [] }: { checks: TrimCheckDisplay[]; unchecked?: UncheckedTrimLine[] },
) {
  if (checks.length === 0 && unchecked.length === 0) return null

  const allEnough = unchecked.length === 0 && checks.every((c) => c.enough)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          Trim Availability
          {allEnough
            ? <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700"><CheckCircle className="w-4 h-4" />Enough on hand</span>
            : unchecked.length > 0 && checks.every((c) => c.enough)
            ? <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600"><AlertTriangle className="w-4 h-4" />Needs attention</span>
            : <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600"><AlertTriangle className="w-4 h-4" />Short on trim</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-muted-foreground border-y">
            <tr>
              <th className="text-left p-3">Trim</th>
              <th className="text-left p-3">Finish</th>
              <th className="text-right p-3">This order needs</th>
              <th className="text-right p-3">Free (after other orders)</th>
              <th className="text-right p-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {checks.map((c) => (
              <tr key={`${c.productId}:${c.finishId}`} className="bg-white">
                <td className="p-3 font-medium">{c.productName}</td>
                <td className="p-3">
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full border border-slate-300"
                      style={swatchStyle(
                        c.finishHex || c.finishGradient || c.finishTexture
                          ? { hex: c.finishHex ?? '#e2e8f0', gradient: c.finishGradient ?? undefined, texture: c.finishTexture ?? undefined }
                          : null,
                      )}
                    />
                    {c.finishName}
                  </span>
                </td>
                <td className="p-3 text-right font-mono">{c.neededPieces.toLocaleString()} pc</td>
                <td className="p-3 text-right font-mono">{c.availablePieces.toLocaleString()} pc</td>
                <td className="p-3 text-right">
                  {c.enough ? (
                    <span className="text-xs font-medium text-green-700">Enough</span>
                  ) : (
                    <span className="text-xs font-medium text-red-600">
                      Short {(c.neededPieces - c.availablePieces).toLocaleString()} pc
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {unchecked.map((u, idx) => (
              <tr key={`unchecked-${idx}`} className="bg-amber-50/50">
                <td className="p-3 font-medium">{u.productName}</td>
                <td className="p-3 text-muted-foreground">
                  {u.itemColor ?? 'No color set'}
                </td>
                <td className="p-3 text-right font-mono">{u.pieces.toLocaleString()} pc</td>
                <td className="p-3 text-right font-mono text-muted-foreground">—</td>
                <td className="p-3 text-right">
                  <span className="text-xs font-medium text-amber-600">
                    No finish on line — can&apos;t check
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-muted-foreground px-3 py-2 border-t">
          Trim is counted by piece per finish (Inventory → Trim), separately from panel coil footage.
          Free = pieces on hand minus pieces committed to other open orders; short trim is bent from
          the matching color&apos;s coil or ordered.
        </p>
      </CardContent>
    </Card>
  )
}
