import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, AlertTriangle, Truck } from 'lucide-react'
import { COLORS } from '@/lib/product-config'
import type { OrderColorCheck } from '@/lib/coilSupply'

const colorHex = (name: string) => COLORS.find((c) => c.name === name)?.hex ?? '#94a3b8'

function fmtFeet(feet: number): string {
  const sign = feet < 0 ? '-' : ''
  const abs = Math.abs(feet)
  const f = Math.floor(abs)
  const inches = Math.round((abs - f) * 12)
  if (inches === 0 || inches === 12) return `${sign}${(inches === 12 ? f + 1 : f).toLocaleString()} ft`
  return `${sign}${f.toLocaleString()} ft ${inches} in`
}

// Server component: per-color panel coil availability for a single order, so
// staff can confirm there's enough material by color before accepting it.
export default function OrderCoilAvailability(
  { checks, colorsOnOrder = [] }: { checks: OrderColorCheck[]; colorsOnOrder?: string[] },
) {
  if (checks.length === 0) return null

  const onOrder = new Set(colorsOnOrder)
  const allEnough = checks.every((c) => c.enough)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          Panel Coil Availability
          {allEnough
            ? <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700"><CheckCircle className="w-4 h-4" />Enough on hand</span>
            : <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600"><AlertTriangle className="w-4 h-4" />Short by color</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-muted-foreground border-y">
            <tr>
              <th className="text-left p-3">Color</th>
              <th className="text-right p-3">This order needs</th>
              <th className="text-right p-3">Free (after other orders)</th>
              <th className="text-right p-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {checks.map((c) => (
              <tr key={c.color} className="bg-white">
                <td className="p-3">
                  <span className="inline-flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full border border-slate-300" style={{ backgroundColor: colorHex(c.color) }} />
                    {c.color}
                  </span>
                </td>
                <td className="p-3 text-right font-mono">{fmtFeet(c.neededFeet)}</td>
                <td className="p-3 text-right font-mono">
                  {fmtFeet(c.availableFeet)}
                  {c.hasUnweighed && <span className="text-amber-500 ml-1" title="Includes unweighed estimate">*</span>}
                </td>
                <td className="p-3 text-right">
                  {c.enough ? (
                    <span className="text-xs font-medium text-green-700">Enough</span>
                  ) : (
                    <div className="space-y-0.5">
                      <span className="text-xs font-medium text-red-600">Short {fmtFeet(c.neededFeet - c.availableFeet)}</span>
                      {onOrder.has(c.color) ? (
                        <span className="flex items-center justify-end gap-1 text-xs font-medium text-blue-600">
                          <Truck className="w-3.5 h-3.5" />On order
                        </span>
                      ) : (
                        <span className="block text-xs font-medium text-amber-600">Needs ordering</span>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-muted-foreground px-3 py-2 border-t">
          Free footage = estimated on-hand (measured where weighed) minus footage committed to other open orders.
          <span className="text-amber-500"> *</span> includes coils not yet weighed.
          Short colors show <span className="text-blue-600 font-medium">On order</span> when the color already
          appears on an open purchase order, or <span className="text-amber-600 font-medium">Needs ordering</span> otherwise.
        </p>
      </CardContent>
    </Card>
  )
}
