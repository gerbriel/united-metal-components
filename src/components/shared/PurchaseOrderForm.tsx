'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Trash2, Loader2, Save } from 'lucide-react'
import { COLORS } from '@/lib/product-config'
import type { Vendor } from './VendorManager'

export interface POItem {
  id?: string
  product_id?: number | null
  description: string
  quantity: string
  unit: string
  unit_cost: string
  quantity_received?: number
  color: string
  notes: string
}

const NO_COLOR = '__none__'
const colorHex = (name: string) => COLORS.find((c) => c.name === name)?.hex ?? '#94a3b8'

// Pull a known finish color out of free text (product name / description) so a
// coil line like "29 GA Sheet Metal Coil — Hawaiian Blue" prefills the Color
// dropdown. Longest match wins so "Light Stone" beats "Stone".
function detectColor(text: string): string | null {
  const t = text.toLowerCase()
  const hit = COLORS.filter((c) => t.includes(c.name.toLowerCase()))
    .sort((a, b) => b.name.length - a.name.length)[0]
  return hit?.name ?? null
}

export interface PurchaseOrder {
  id: string
  po_number: string | null
  vendor_id: string | null
  status: string
  order_date: string
  expected_date: string | null
  received_date: string | null
  notes: string | null
  subtotal: number | null
  total: number | null
  vendors?: { name: string } | null
  purchase_order_items?: POItem[]
}

interface Props {
  vendors: Vendor[]
  existingPO?: PurchaseOrder
}

const EMPTY_LINE: POItem = { description: '', quantity: '1', unit: '', unit_cost: '', color: '', notes: '' }

// A single autocomplete suggestion drawn from the live inventory catalog.
// `product` picks fill the row (description + unit + product link); `color` and
// `astm` picks append a descriptor to whatever the user has already typed.
type Suggestion = {
  kind: 'product' | 'color' | 'astm'
  label: string
  sublabel?: string
  unit?: string | null
  product_id?: number | null
}

const KIND_LABEL: Record<Suggestion['kind'], string> = {
  product: 'Product',
  color: 'Color',
  astm: 'ASTM',
}

// Append a color/ASTM descriptor onto an existing description, replacing any
// trailing partial word the user was typing so "…coil haw" → "…coil — Hawaiian Blue".
function appendDescriptor(current: string, token: string) {
  let base = current
  const lastWord = current.split(/\s+/).pop() ?? ''
  if (
    lastWord &&
    lastWord.toLowerCase() !== token.toLowerCase() &&
    token.toLowerCase().startsWith(lastWord.toLowerCase())
  ) {
    base = current.slice(0, current.length - lastWord.length)
  }
  base = base.replace(/[\s—-]+$/, '').trim()
  if (!base) return token
  if (base.toLowerCase().includes(token.toLowerCase())) return base
  return `${base} — ${token}`
}

interface MaterialInputProps {
  value: string
  suggestions: Suggestion[]
  placeholder?: string
  onChange: (value: string) => void
  onPick: (s: Suggestion) => void
}

// Description field with an inventory-aware suggestion dropdown. Never locks the
// user in — free text always wins; suggestions are opt-in convenience.
function MaterialInput({ value, suggestions, placeholder, onChange, onPick }: MaterialInputProps) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase()
    if (q.length < 1) return []
    const lastWord = q.split(/\s+/).pop() ?? ''
    return suggestions
      .filter((s) => {
        const l = s.label.toLowerCase()
        const sub = (s.sublabel ?? '').toLowerCase()
        return (
          l.includes(q) ||
          sub.includes(q) ||
          (lastWord.length >= 2 && (l.includes(lastWord) || sub.includes(lastWord)))
        )
      })
      .slice(0, 8)
  }, [value, suggestions])

  // Fixed-position dropdown so it escapes the table's overflow container and the
  // edit dialog. Track the input's viewport rect while open.
  useEffect(() => {
    if (!open) return
    const update = () => inputRef.current && setRect(inputRef.current.getBoundingClientRect())
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open, matches.length, value])

  const showList = open && matches.length > 0 && rect

  const pick = (s: Suggestion) => {
    onPick(s)
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!showList) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, matches.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); pick(matches[active] ?? matches[0]) }
    else if (e.key === 'Escape') { setOpen(false) }
  }

  return (
    <>
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(0) }}
        onFocus={() => setOpen(true)}
        onBlur={() => { blurTimer.current = setTimeout(() => setOpen(false), 120) }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="border-0 shadow-none px-0 h-8"
        autoComplete="off"
      />
      {showList && (
        <div
          style={{ position: 'fixed', top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 260), zIndex: 60 }}
          className="rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 p-1 max-h-64 overflow-y-auto"
          onMouseDown={(e) => { e.preventDefault(); if (blurTimer.current) clearTimeout(blurTimer.current) }}
        >
          {matches.map((s, idx) => (
            <button
              key={`${s.kind}-${s.label}-${idx}`}
              type="button"
              onMouseEnter={() => setActive(idx)}
              onClick={() => pick(s)}
              className={`w-full text-left flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${idx === active ? 'bg-accent' : ''}`}
            >
              <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {KIND_LABEL[s.kind]}
              </span>
              <span className="truncate">{s.label}</span>
              {s.sublabel && <span className="ml-auto truncate text-xs text-muted-foreground">{s.sublabel}</span>}
            </button>
          ))}
        </div>
      )}
    </>
  )
}

export default function PurchaseOrderForm({ vendors, existingPO }: Props) {
  const isEdit = !!existingPO
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    vendor_id:     existingPO?.vendor_id ?? '',
    order_date:    existingPO?.order_date ?? new Date().toISOString().slice(0, 10),
    expected_date: existingPO?.expected_date ?? '',
    notes:         existingPO?.notes ?? '',
  })
  const [lines, setLines] = useState<POItem[]>(
    existingPO?.purchase_order_items?.length
      ? existingPO.purchase_order_items.map((i) => ({
          ...i,
          quantity:  String(i.quantity),
          unit_cost: String(i.unit_cost ?? ''),
          color:     i.color ?? '',
          notes:     i.notes ?? '',
        }))
      : [EMPTY_LINE]
  )
  const router = useRouter()
  const supabase = createClient()

  // Live inventory catalog for description autocomplete — products (tubing,
  // panels, trim, screws…), coil colors, and ASTM specs. Suggestions only;
  // the user can always type something that isn't in inventory.
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  useEffect(() => {
    let active = true
    ;(async () => {
      const [{ data: prods }, { data: coils }, { data: astm }] = await Promise.all([
        supabase.from('products').select('id, name, sku, unit, product_type').eq('active', true).order('name'),
        supabase.from('product_coils').select('color').not('color', 'is', null),
        supabase.from('astm_codes').select('code, description').eq('archived', false).order('code'),
      ])
      if (!active) return
      const list: Suggestion[] = []
      for (const p of (prods ?? []) as any[]) {
        list.push({
          kind: 'product',
          label: p.name,
          sublabel: p.sku ? `SKU ${p.sku}` : (p.product_type ?? undefined),
          unit: p.unit,
          product_id: p.id,
        })
      }
      const colors = [...new Set(((coils ?? []) as any[]).map((c) => c.color).filter(Boolean))]
      for (const c of colors) list.push({ kind: 'color', label: c as string })
      for (const a of (astm ?? []) as any[]) {
        list.push({ kind: 'astm', label: a.code, sublabel: a.description ?? undefined })
      }
      setSuggestions(list)
    })()
    return () => { active = false }
  }, [supabase])

  const setF = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const setLine = (i: number, k: keyof POItem) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setLines((ls) => ls.map((l, idx) => idx === i ? { ...l, [k]: e.target.value } : l))

  // Manual edits to the description break the product link. Auto-fill the Color
  // dropdown when the text mentions a known finish and no color is set yet.
  const setDescription = (i: number, value: string) =>
    setLines((ls) => ls.map((l, idx) =>
      idx === i ? { ...l, description: value, product_id: null, color: l.color || (detectColor(value) ?? '') } : l))

  const setColor = (i: number, value: string) =>
    setLines((ls) => ls.map((l, idx) => idx === i ? { ...l, color: value } : l))

  const pickSuggestion = (i: number, s: Suggestion) =>
    setLines((ls) => ls.map((l, idx) => {
      if (idx !== i) return l
      if (s.kind === 'product') {
        return {
          ...l,
          description: s.label,
          product_id: s.product_id ?? null,
          unit: l.unit || s.unit || '',
          color: l.color || (detectColor(s.label) ?? ''),
        }
      }
      // A color pick fills the dedicated Color dropdown; ASTM still appends to the text.
      if (s.kind === 'color') return { ...l, color: s.label }
      return { ...l, description: appendDescriptor(l.description, s.label) }
    }))

  const addLine = () => setLines((ls) => [...ls, EMPTY_LINE])
  const removeLine = (i: number) => setLines((ls) => ls.filter((_, idx) => idx !== i))

  const subtotal = lines.reduce((sum, l) => {
    const q = parseFloat(l.quantity) || 0
    const c = parseFloat(l.unit_cost) || 0
    return sum + q * c
  }, 0)

  const handleSave = async (status?: string) => {
    const validLines = lines.filter((l) => l.description.trim() || l.unit_cost)
    if (!form.vendor_id) { toast.error('Select a vendor'); return }
    if (validLines.length === 0) { toast.error('Add at least one line item'); return }
    setSaving(true)

    const poPayload = {
      vendor_id:     form.vendor_id,
      order_date:    form.order_date,
      expected_date: form.expected_date || null,
      notes:         form.notes || null,
      subtotal,
      total:         subtotal,
      status:        status ?? (existingPO?.status ?? 'draft'),
    }

    let poId = existingPO?.id
    if (isEdit && poId) {
      const { error } = await supabase.from('purchase_orders').update(poPayload).eq('id', poId)
      if (error) { toast.error('Failed to update PO'); setSaving(false); return }
      // Re-insert all items (simple approach — delete then insert)
      await supabase.from('purchase_order_items').delete().eq('po_id', poId)
    } else {
      const { data, error } = await supabase
        .from('purchase_orders')
        .insert(poPayload)
        .select('id')
        .single()
      if (error || !data) { toast.error('Failed to create PO'); setSaving(false); return }
      poId = (data as any).id
    }

    const itemsPayload = validLines.map((l) => ({
      po_id:       poId,
      description: l.description.trim() || null,
      quantity:    parseFloat(l.quantity) || 1,
      unit:        l.unit || null,
      unit_cost:   parseFloat(l.unit_cost) || null,
      color:       l.color || null,
      notes:       l.notes || null,
    }))

    const { error: itemErr } = await supabase.from('purchase_order_items').insert(itemsPayload)
    if (itemErr) { toast.error('Saved PO but failed to save items'); setSaving(false); return }

    toast.success(isEdit ? 'PO updated' : 'PO created')
    router.push(`/dashboard/purchase-orders/${poId}`)
    router.refresh()
    setSaving(false)
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header fields */}
      <Card>
        <CardHeader><CardTitle className="text-base">Purchase Order Details</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Vendor *</Label>
            <Select value={form.vendor_id} onValueChange={(v: string | null) => setForm((f) => ({ ...f, vendor_id: v ?? '' }))}>
              <SelectTrigger><SelectValue placeholder="Select vendor…" /></SelectTrigger>
              <SelectContent>
                {vendors.filter((v) => v.active).map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Order Date</Label>
            <Input type="date" value={form.order_date} onChange={setF('order_date')} />
          </div>
          <div className="space-y-1.5">
            <Label>Expected Delivery</Label>
            <Input type="date" value={form.expected_date} onChange={setF('expected_date')} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Notes</Label>
            <Input value={form.notes} onChange={setF('notes')} placeholder="Delivery instructions, special requests…" />
          </div>
        </CardContent>
      </Card>

      {/* Line items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Line Items</CardTitle>
            <Button size="sm" variant="outline" onClick={addLine} className="gap-1">
              <Plus className="w-3.5 h-3.5" />Add Line
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-muted-foreground border-b">
                <tr>
                  <th className="text-left p-3 min-w-[200px]">Description / Material</th>
                  <th className="text-left p-3 w-40">Color</th>
                  <th className="text-right p-3 w-24">Qty</th>
                  <th className="text-left p-3 w-24">Unit</th>
                  <th className="text-right p-3 w-28">Unit Cost</th>
                  <th className="text-right p-3 w-28">Total</th>
                  <th className="p-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {lines.map((line, i) => {
                  const lineTotal = (parseFloat(line.quantity) || 0) * (parseFloat(line.unit_cost) || 0)
                  return (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-2">
                        <MaterialInput
                          value={line.description}
                          suggestions={suggestions}
                          placeholder="e.g. 29 GA Panel Coil — Hawaiian Blue"
                          onChange={(v) => setDescription(i, v)}
                          onPick={(s) => pickSuggestion(i, s)}
                        />
                        <Input
                          value={line.notes}
                          onChange={setLine(i, 'notes')}
                          placeholder="Notes (ASTM, coil ID, color, gauge…)"
                          className="border-0 shadow-none px-0 h-7 text-xs text-muted-foreground mt-0.5"
                        />
                      </td>
                      <td className="p-2">
                        <Select
                          value={line.color || NO_COLOR}
                          onValueChange={(v: string | null) => setColor(i, v === NO_COLOR ? '' : (v ?? ''))}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Color…" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NO_COLOR}>— None —</SelectItem>
                            {COLORS.map((c) => (
                              <SelectItem key={c.name} value={c.name}>
                                <span className="flex items-center gap-2">
                                  <span
                                    className="w-3 h-3 rounded-full border border-slate-300 shrink-0"
                                    style={{ background: c.gradient ?? c.hex }}
                                  />
                                  {c.name}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2">
                        <Input
                          type="number" min="0" step="any"
                          value={line.quantity}
                          onChange={setLine(i, 'quantity')}
                          className="text-right h-8"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          value={line.unit}
                          onChange={setLine(i, 'unit')}
                          placeholder="lbs / ea / coil"
                          className="h-8"
                        />
                      </td>
                      <td className="p-2">
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                          <Input
                            type="number" min="0" step="0.01"
                            value={line.unit_cost}
                            onChange={setLine(i, 'unit_cost')}
                            className="text-right pl-5 h-8"
                          />
                        </div>
                      </td>
                      <td className="p-2 text-right font-medium">
                        {lineTotal > 0 ? `$${lineTotal.toFixed(2)}` : '—'}
                      </td>
                      <td className="p-2">
                        {lines.length > 1 && (
                          <button
                            onClick={() => removeLine(i)}
                            className="h-7 w-7 flex items-center justify-center rounded hover:bg-red-50 text-muted-foreground hover:text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="border-t bg-slate-50">
                <tr>
                  <td colSpan={5} className="p-3 text-right text-sm font-medium">Subtotal</td>
                  <td className="p-3 text-right font-bold">${subtotal.toFixed(2)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button onClick={() => handleSave('draft')} disabled={saving} variant="outline">
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          <Save className="w-4 h-4 mr-2" />Save Draft
        </Button>
        <Button onClick={() => handleSave('submitted')} disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Submit to Vendor
        </Button>
        <Button variant="ghost" onClick={() => router.push('/dashboard/purchase-orders')}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
