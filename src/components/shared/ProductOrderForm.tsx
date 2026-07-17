'use client'

import { useEffect, useState } from 'react'
import { useConfigurator } from '@/store/configurator'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ShoppingCart, Phone, Minus, Plus, PackageCheck, AlertTriangle, ClipboardList } from 'lucide-react'
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
  swatchStyle,
} from '@/lib/product-config'
import { useFinishes } from '@/lib/useFinishes'

// Live coil availability for one color (panels) or the shared pool (hat/brace).
// `onOrderFeet` is footage sitting on open purchase orders, not yet received.
export interface CoilAvailability {
  netFeet: number        // free on-hand estimate after footage committed to open orders
  onOrderFeet: number    // footage on open POs not yet received
  hasUnweighed: boolean  // estimate leans on coils not yet weighed
}

// One in-stock overstock listing — a batch of identical pre-made panels. Prices
// stay staff-only, so only the dimensions, color, and net-available count reach
// the storefront (see public_panel_overstock, migration 032).
export interface OverstockItem {
  id: number
  color: string | null   // null = bare / no color
  lengthFt: number
  lengthIn: number
  qty: number            // net available
}

export type Availability =
  | { kind: 'panel'; byColor: Record<string, CoilAvailability> }
  | { kind: 'pool'; pool: CoilAvailability }
  | { kind: 'overstock'; items: OverstockItem[] }
  | { kind: 'static' }

// "13' 6"" / "10 ft" — how an overstock piece length reads on the storefront.
const fmtLen = (ft: number, inches: number) => (inches ? `${ft}' ${inches}"` : `${ft} ft`)
const BARE = ' ' // sentinel key for the null-color (bare) group

const fmtFt = (n: number) => `${Math.max(0, Math.round(n)).toLocaleString()} ft`

interface Props {
  product: Product
  isContractor: boolean
  availability?: Availability
  preselectOverstockId?: number   // overstock listing to auto-select (from an overstock card)
}

export default function ProductOrderForm({ product, isContractor, availability, preselectOverstockId }: Props) {
  const addItem = useCartStore((s) => s.addItem)
  // Live, staff-editable palette (falls back to the COLORS constant before the
  // fetch resolves), driving the color picker below.
  const palette = useFinishes()
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

  // Arriving from an overstock card (?o=id): the exact piece to preselect, so the
  // color group opens and the listing is chosen on mount — buyer only picks a qty.
  const preItem =
    preselectOverstockId != null && availability?.kind === 'overstock'
      ? availability.items.find((i) => i.id === preselectOverstockId) ?? null
      : null

  const [selectedLength, setSelectedLength] = useState<number | null>(preItem?.lengthFt ?? null)
  const [useCustom, setUseCustom] = useState(false)
  const [customFt, setCustomFt] = useState('')
  const [customIn, setCustomIn] = useState('')
  const [selectedColor, setSelectedColor] = useState<string | null>(preItem?.color ?? null)
  const [qty, setQty] = useState(1)
  // Overstock: which color group is open (undefined = none) + the chosen listing.
  const [overColor, setOverColor] = useState<string | undefined>(preItem ? (preItem.color ?? BARE) : undefined)
  const [overstockId, setOverstockId] = useState<number | null>(preItem?.id ?? null)

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

  // Overstock panels — discrete pre-made pieces. Pick a color, then one of the
  // exact lengths in stock for that color; qty caps at what's available. Prices
  // stay hidden (quote flow), same as the rest of the catalog.
  if (availability?.kind === 'overstock') {
    const items = availability.items
    if (items.length === 0) {
      return (
        <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <p className="font-semibold text-sm">Currently out of stock</p>
          <p className="text-sm text-muted-foreground">
            No overstock panels are available right now. Please check back soon or call us for current availability.
          </p>
          <a href="tel:+15595679117" className="inline-flex items-center gap-2 text-primary font-semibold text-sm hover:underline">
            <Phone className="w-4 h-4" />(559) 567-9117
          </a>
        </div>
      )
    }

    // Distinct color groups in first-seen order (RPC preserves palette order).
    const groupKeys: string[] = []
    const seen = new Set<string>()
    for (const it of items) {
      const k = it.color ?? BARE
      if (!seen.has(k)) { seen.add(k); groupKeys.push(k) }
    }
    const groupItems = (key: string) =>
      items
        .filter((it) => (it.color ?? BARE) === key)
        .sort((a, b) => a.lengthFt - b.lengthFt || a.lengthIn - b.lengthIn)

    const activeItems = overColor ? groupItems(overColor) : []
    const listing = items.find((it) => it.id === overstockId) ?? null
    const maxQty = listing ? listing.qty : 1
    const addQty = Math.min(qty, maxQty)

    const pickColor = (key: string) => {
      setOverColor(key)
      setOverstockId(null)
      setSelectedColor(key === BARE ? null : key) // drive the 3D viewer finish
      setQty(1)
    }
    const pickListing = (it: OverstockItem) => {
      setOverstockId(it.id)
      setSelectedLength(it.lengthFt)
      setQty(1)
    }
    const handleAddOver = () => {
      if (!listing) return
      addItem(product, addQty, {
        length:      listing.lengthFt,
        lengthIn:    listing.lengthIn || undefined,
        color:       listing.color ?? undefined,
        overstockId: listing.id,
      })
      const parts = [fmtLen(listing.lengthFt, listing.lengthIn)]
      if (listing.color) parts.push(listing.color)
      toast.success(`${addQty} × ${product.name} (${parts.join(' · ')}) added to cart`)
    }

    return (
      <div className="space-y-6">
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-medium text-blue-900">Overstock — limited quantities</p>
          <p className="text-xs text-blue-800 mt-0.5">
            Pre-made panels in the exact lengths and colors below. Once they&apos;re gone, they&apos;re gone.
          </p>
        </div>

        {/* Color */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Color</Label>
          <div className="flex flex-wrap gap-2">
            {groupKeys.map((key) => {
              const entry = key === BARE ? null : COLORS.find((c) => c.name === key)
              const active = overColor === key
              return (
                <button
                  key={key}
                  type="button"
                  title={key === BARE ? 'No color' : key}
                  onClick={() => pickColor(key)}
                  className={[
                    'w-9 h-9 rounded-full border-2 transition-all overflow-hidden',
                    active
                      ? 'border-primary scale-110 shadow-md ring-2 ring-primary/30'
                      : 'border-white shadow-sm hover:scale-105 hover:border-primary/60',
                  ].join(' ')}
                  style={swatchStyle(entry)}
                />
              )
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            {overColor
              ? <>Selected: <span className="font-medium text-foreground">{overColor === BARE ? 'No color' : overColor}</span></>
              : 'Select a color to see available lengths'}
          </p>
        </div>

        {/* Length (per color) */}
        {overColor && (
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Length</Label>
            <div className="flex flex-wrap gap-2">
              {activeItems.map((it) => {
                const active = overstockId === it.id
                return (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => pickListing(it)}
                    className={[
                      'px-4 py-2.5 rounded-lg border text-sm font-medium transition-all text-left',
                      active
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'border-slate-200 hover:border-primary hover:text-primary bg-white',
                    ].join(' ')}
                  >
                    <span className="block">{fmtLen(it.lengthFt, it.lengthIn)}</span>
                    <span className={['block text-xs', active ? 'text-white/80' : 'text-muted-foreground'].join(' ')}>
                      {it.qty} available
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Quantity + Add */}
        <div className="flex items-end gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm">Pieces</Label>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="icon" type="button" onClick={() => setQty(Math.max(1, qty - 1))} disabled={!listing}>
                <Minus className="w-3 h-3" />
              </Button>
              <Input
                type="number" min={1} max={maxQty}
                value={qty}
                onChange={(e) => setQty(Math.min(maxQty, Math.max(1, Number(e.target.value))))}
                className="w-16 text-center"
                disabled={!listing}
              />
              <Button variant="outline" size="icon" type="button" onClick={() => setQty(Math.min(maxQty, qty + 1))} disabled={!listing || qty >= maxQty}>
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>
          <Button size="lg" className="flex-1 gap-2" onClick={handleAddOver} disabled={!listing}>
            <ShoppingCart className="w-4 h-4" />Add to Cart
          </Button>
        </div>

        {!listing && (
          <p className="text-xs text-amber-600">
            {overColor ? 'Select a length above' : 'Select a color, then a length'}
          </p>
        )}
      </div>
    )
  }

  const isOutOfStock = product.stock_qty === 0

  const canAdd =
    (!hasLengths || (useCustom ? (parseFloat(customFt) || 0) > 0 : selectedLength !== null)) &&
    (!hasColor || selectedColor !== null)

  // Live coil availability (panels per selected color; hat channel / braces from
  // the shared pool). Falls back to nothing so the page's static badge shows.
  const coil: CoilAvailability | null =
    availability?.kind === 'pool' ? availability.pool
    : availability?.kind === 'panel' ? (selectedColor ? availability.byColor[selectedColor] ?? { netFeet: 0, onOrderFeet: 0, hasUnweighed: false } : null)
    : null
  const needsColorFirst = availability?.kind === 'panel' && !selectedColor

  // Linear feet this order would draw from the coil — qty × per-piece length.
  const perPieceFt = hasLengths
    ? (useCustom ? (parseFloat(customFt) || 0) + (parseFloat(customIn) || 0) / 12 : (selectedLength ?? 0))
    : 0
  const neededFeet = perPieceFt * qty

  // When the order can't come off the shelf as-is it becomes a special-order
  // request instead of a cart add: the live coil footage for the chosen
  // color/pool can't cover it, or (non-coil items) the order exceeds stock.
  const isCoilProduct = availability?.kind === 'panel' || availability?.kind === 'pool'
  const coilShort = coil != null && (coil.netFeet <= 0 || coil.netFeet < neededFeet)
  const staticShort = !isCoilProduct && qty > product.stock_qty
  const isRequest = coilShort || staticShort
  // Nothing available at all, vs. some stock that just can't cover this order.
  const fullyOut = isCoilProduct ? (coil != null && coil.netFeet <= 0) : isOutOfStock

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
    if (isRequest) {
      toast.success(`Special order request added for ${product.name}${detail}`)
    } else {
      toast.success(`${qty} × ${product.name}${detail} added to cart`)
    }
  }

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

      {/* Request notice — shown whenever the order can't be filled from stock */}
      {isRequest && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm font-medium text-amber-800">
            {fullyOut ? 'Currently out of stock' : 'Not enough in stock for this order'}
          </p>
          <p className="text-xs text-amber-700 mt-0.5">
            {fullyOut
              ? "You can still request this item — we'll special order it and notify you of the estimated arrival."
              : "You can still submit this as a request — we'll special order the balance and notify you of the estimated arrival."}
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
            {palette.map((c) => (
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
                style={swatchStyle(c)}
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
          {isRequest ? <ClipboardList className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
          {isRequest ? 'Request' : 'Add to Cart'}
        </Button>
      </div>

      {/* Validation hints */}
      {!canAdd && hasLengths && !selectedLength && !useCustom && (
        <p className="text-xs text-amber-600">Please select a length above</p>
      )}
    </div>
  )
}
