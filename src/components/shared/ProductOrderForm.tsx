'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ShoppingCart, Phone, Minus, Plus } from 'lucide-react'
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
} from '@/lib/product-config'

interface Props {
  product: Product
  isContractor: boolean
}

export default function ProductOrderForm({ product, isContractor }: Props) {
  const addItem = useCartStore((s) => s.addItem)
  const sku = product.sku ?? ''

  const tubingConfig = TUBING_CONFIG[sku]
  const isPanel = PANEL_SKUS.has(sku)
  const isHatChannel = sku === 'HAT-CHANNEL'
  const isBrace = sku === 'BRACE'
  const hasColor = COLOR_SKUS.has(sku)

  const lengths =
    tubingConfig?.type === 'preset' ? tubingConfig.lengths
    : isPanel ? PANEL_LENGTHS
    : isHatChannel ? HAT_CHANNEL_LENGTHS
    : isBrace ? BRACE_LENGTHS
    : null

  const hasLengths = lengths !== null

  const [selectedLength, setSelectedLength] = useState<number | null>(null)
  const [useCustom, setUseCustom] = useState(false)
  const [customFt, setCustomFt] = useState('')
  const [customIn, setCustomIn] = useState('')
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [qty, setQty] = useState(1)

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
          href="tel:+15599400210"
          className="inline-flex items-center gap-2 text-primary font-semibold text-sm hover:underline"
        >
          <Phone className="w-4 h-4" />
          (559) 940-0210
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

  return (
    <div className="space-y-6">
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

            {/* Custom length option — contractors only, panels only */}
            {isContractor && isPanel && (
              <button
                type="button"
                onClick={() => { setUseCustom(true); setSelectedLength(null) }}
                className={[
                  'px-4 py-2.5 rounded-lg border text-sm font-medium transition-all',
                  useCustom
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'border-slate-200 hover:border-primary hover:text-primary bg-white',
                ].join(' ')}
              >
                Custom
              </button>
            )}
          </div>

          {/* Custom length inputs */}
          {useCustom && isContractor && isPanel && (
            <div className="flex items-end gap-3 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Feet</Label>
                <Input
                  type="number"
                  min={1}
                  value={customFt}
                  onChange={(e) => setCustomFt(e.target.value)}
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
                  onChange={(e) => setCustomIn(e.target.value)}
                  className="w-20 text-center"
                  placeholder="0"
                />
              </div>
            </div>
          )}
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
                  c.image
                    ? { backgroundImage: `url(${c.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
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
