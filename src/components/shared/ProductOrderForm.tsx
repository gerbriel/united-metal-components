'use client'

import { useEffect, useState } from 'react'
import { useConfigurator } from '@/store/configurator'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ShoppingCart, Phone, Minus, Plus, PackageCheck, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useCartStore } from '@/store/cart'
import { toast } from 'sonner'
import type { Product } from '@/types/database'
import {
  COLORS,
  TUBING_CONFIG,
  HAT_CHANNEL_LENGTHS,
  BRACE_LENGTHS,
  PANEL_LENGTHS,
  COLOR_SKUS,
  PANEL_SKUS,
  isWasherScrew,
  variantGroupFor,
} from '@/lib/product-config'

// Live coil availability for one color (panels) or the shared pool (hat/brace).
// `onOrderFeet` is footage sitting on open purchase orders, not yet received.
export interface CoilAvailability {
  netFeet: number        // free on-hand estimate after footage committed to open orders
  onOrderFeet: number    // footage on open POs not yet received
  hasUnweighed: boolean  // estimate leans on coils not yet weighed
}

export type Availability =
  | { kind: 'panel'; byColor: Record<string, CoilAvailability> }
  | { kind: 'pool'; pool: CoilAvailability }
  | { kind: 'static' }

const fmtFt = (n: number) => `${Math.max(0, Math.round(n)).toLocaleString()} ft`

interface Props {
  product: Product
  isContractor: boolean
  availability?: Availability
}

export default function ProductOrderForm({ product, isContractor, availability }: Props) {
  const addItem = useCartStore((s) => s.addItem)
  const sku = product.sku ?? ''

  const tubingConfig = TUBING_CONFIG[sku]
  const isPanel = PANEL_SKUS.has(sku)
  const isHatChannel = sku === 'HAT-CHANNEL'
  const isBrace = sku === 'BRACE'
  // Washered/colored roofing screws share the panel color palette (bare screws
  // don't). A variant group's `colors` flag overrides the SKU/name detection —
  // e.g. the 125-ct box is washered but its name never says so.
  const group = variantGroupFor(sku)
  const hasColor = group?.colors ?? (COLOR_SKUS.has(sku) || isWasherScrew(sku, product.name))

  const lengths =
    tubingConfig?.type === 'preset' ? tubingConfig.lengths
    : isPanel ? PANEL_LENGTHS
    : isHatChannel ? HAT_CHANNEL_LENGTHS
    : isBrace ? BRACE_LENGTHS
    : null

  const hasLengths = lengths !== null

  // Contractors can request a non-standard cut length on the length-based
  // coil products — panels, hat channel, and braces (C-channel). Prices are
  // never shown on the storefront; a custom length is simply a quote request.
  const supportsCustomLength = isContractor && (isPanel || isHatChannel || isBrace)

  const [selectedLength, setSelectedLength] = useState<number | null>(null)
  const [useCustom, setUseCustom] = useState(false)
  const [customFt, setCustomFt] = useState('')
  const [customIn, setCustomIn] = useState('')
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [qty, setQty] = useState(1)

  // Drive the interactive 3D viewer's finish from the selected color. Reset the
  // shared configurator when this form mounts for a (new) product.
  const setStoreColor = useConfigurator((s) => s.setColor)
  const resetConfig = useConfigurator((s) => s.reset)
  useEffect(() => { resetConfig() }, [product.id, resetConfig])
  useEffect(() => { setStoreColor(selectedColor) }, [selectedColor, setStoreColor])

  // Special order — call only
  if (tubingConfig?.type === 'special-order') {
    return (
      <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
        <p className="font-semibold text-sm">Special Order — Contact Us</p>
        <p className="text-sm text-muted-foreground">
          12 GA tubing is available in custom lengths. Please call to place your order and we&apos;ll
          get you exactly what you need.
        </p>
        <a
          href="tel:+15595679117"
          className="inline-flex items-center gap-2 text-primary font-semibold text-sm hover:underline"
        >
          <Phone className="w-4 h-4" />
          (559) 567-9117
        </a>
      </div>
    )
  }

  const isOutOfStock = product.stock_qty === 0

  const canAdd =
    (!hasLengths || (useCustom ? (parseFloat(customFt) || 0) > 0 : selectedLength !== null)) &&
    (!hasColor || selectedColor !== null)

  const handleAdd = () => {
    if (!canAdd) return

    const lengthVal  = useCustom ? (parseFloat(customFt) || 0) : (selectedLength ?? undefined)
    const lengthInVal = useCustom ? (parseFloat(customIn) || 0) : 0

    addItem(product, qty, {
      length:   lengthVal,
      lengthIn: lengthInVal || undefined,
      color:    selectedColor ?? undefined,
    })

    const parts: string[] = []
    if (lengthVal) parts.push(lengthInVal ? `${lengthVal} ft ${lengthInVal} in` : `${lengthVal} ft`)
    if (selectedColor) parts.push(selectedColor)
    const detail = parts.length ? ` (${parts.join(' · ')})` : ''
    if (isOutOfStock) {
      toast.success(`Special order request added for ${product.name}${detail}`)
    } else {
      toast.success(`${qty} × ${product.name}${detail} added to cart`)
    }
  }

  // Live coil availability (panels per selected color; hat channel / braces from
  // the shared pool). Falls back to nothing so the page's static badge shows.
  const coil: CoilAvailability | null =
    availability?.kind === 'pool' ? availability.pool
    : availability?.kind === 'panel' ? (selectedColor ? availability.byColor[selectedColor] ?? { netFeet: 0, onOrderFeet: 0, hasUnweighed: false } : null)
    : null
  const needsColorFirst = availability?.kind === 'panel' && !selectedColor

  return (
    <div className="space-y-6">
      {/* Live availability — estimated linear feet free to promise, with what's
          on order when we're short */}
      {(coil || needsColorFirst) && (
        <div className="space-y-1.5">
          {needsColorFirst ? (
            <Badge variant="secondary" className="gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />Select a color to see availability
            </Badge>
          ) : coil && coil.netFeet > 0 ? (
            <Badge className="bg-green-100 text-green-800 border-green-200 gap-1.5">
              <PackageCheck className="w-3.5 h-3.5" />
              {coil.hasUnweighed ? '~' : ''}{fmtFt(coil.netFeet)} available
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />Out of stock
            </Badge>
          )}
        </div>
      )}

      {/* Out-of-stock notice */}
      {isOutOfStock && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm font-medium text-amber-800">Currently out of stock</p>
          <p className="text-xs text-amber-700 mt-0.5">
            You can still request this item — we&apos;ll special order it and notify you of the estimated arrival.
          </p>
        </div>
      )}

      {/* Length selector */}
      {lengths && (
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Length</Label>

          {/* Contractors: custom cut length is always available, shown above the
              standard lengths. Typing/focusing it selects custom; clicking a
              preset switches back. */}
          {supportsCustomLength && (
            <div
              className={[
                'space-y-2 rounded-lg border p-3 transition-all',
                useCustom ? 'border-primary bg-primary/5' : 'border-slate-200 bg-white',
              ].join(' ')}
            >
              <p className="text-xs font-medium text-muted-foreground">Custom cut length</p>
              <div className="flex items-end gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Feet</Label>
                  <Input
                    type="number"
                    min={1}
                    value={customFt}
                    onFocus={() => { setUseCustom(true); setSelectedLength(null) }}
                    onChange={(e) => { setCustomFt(e.target.value); setUseCustom(true); setSelectedLength(null) }}
                    className="w-20 text-center"
                    placeholder="20"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Inches</Label>
                  <Input
                    type="number"
                    min={0}
                    max={11}
                    value={customIn}
                    onFocus={() => { setUseCustom(true); setSelectedLength(null) }}
                    onChange={(e) => { setCustomIn(e.target.value); setUseCustom(true); setSelectedLength(null) }}
                    className="w-20 text-center"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          )}

          {supportsCustomLength && (
            <p className="text-xs text-muted-foreground">Or choose a standard length:</p>
          )}

          <div className="flex flex-wrap gap-2">
            {lengths.map((l) => {
              const label = l <= 3 ? `${l}'` : `${l} ft`
              const isSelected = selectedLength === l && !useCustom
              return (
                <button
                  key={l}
                  type="button"
                  onClick={() => { setSelectedLength(l); setUseCustom(false) }}
                  className={[
                    'px-4 py-2.5 rounded-lg border text-sm font-medium transition-all',
                    isSelected
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'border-slate-200 hover:border-primary hover:text-primary bg-white',
                  ].join(' ')}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Color picker */}
      {hasColor && (
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Color</Label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c.name}
                type="button"
                title={c.name}
                onClick={() => setSelectedColor(c.name)}
                className={[
                  'w-9 h-9 rounded-full border-2 transition-all overflow-hidden',
                  selectedColor === c.name
                    ? 'border-primary scale-110 shadow-md ring-2 ring-primary/30'
                    : 'border-white shadow-sm hover:scale-105 hover:border-primary/60',
                ].join(' ')}
                style={
                  c.gradient
                    ? { backgroundImage: c.gradient }
                    : { backgroundColor: c.hex }
                }
              />
            ))}
          </div>
          {selectedColor ? (
            <p className="text-xs text-muted-foreground">
              Selected: <span className="font-medium text-foreground">{selectedColor}</span>
            </p>
          ) : (
            <p className="text-xs text-amber-600">Select a color to continue</p>
          )}
        </div>
      )}

      {/* Quantity + Add to Cart */}
      <div className="flex items-end gap-3">
        <div className="space-y-1.5">
          <Label className="text-sm">
            {hasLengths ? 'Pieces' : `Qty${product.unit ? ` (${product.unit}s)` : ''}`}
          </Label>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              type="button"
              onClick={() => setQty(Math.max(1, qty - 1))}
            >
              <Minus className="w-3 h-3" />
            </Button>
            <Input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
              className="w-16 text-center"
            />
            <Button
              variant="outline"
              size="icon"
              type="button"
              onClick={() => setQty(qty + 1)}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>

        <Button
          size="lg"
          className="flex-1 gap-2"
          onClick={handleAdd}
          disabled={!canAdd}
        >
          <ShoppingCart className="w-4 h-4" />
          {isOutOfStock ? 'Request Item' : 'Add to Cart'}
        </Button>
      </div>

      {/* Validation hints */}
      {!canAdd && hasLengths && !selectedLength && !useCustom && (
        <p className="text-xs text-amber-600">Please select a length above</p>
      )}
    </div>
  )
}
