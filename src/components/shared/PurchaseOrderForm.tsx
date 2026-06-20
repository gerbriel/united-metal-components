'use client'

import { useState } from 'react'
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
import type { Vendor } from './VendorManager'

export interface POItem {
  id?: string
  product_id?: number | null
  description: string
  quantity: string
  unit: string
  unit_cost: string
  quantity_received?: number
  notes: string
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

const EMPTY_LINE: POItem = { description: '', quantity: '1', unit: '', unit_cost: '', notes: '' }

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
          notes:     i.notes ?? '',
        }))
      : [EMPTY_LINE]
  )
  const router = useRouter()
  const supabase = createClient()

  const setF = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const setLine = (i: number, k: keyof POItem) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setLines((ls) => ls.map((l, idx) => idx === i ? { ...l, [k]: e.target.value } : l))

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
                        <Input
                          value={line.description}
                          onChange={setLine(i, 'description')}
                          placeholder="e.g. 29 GA Panel Coil — Hawaiian Blue"
                          className="border-0 shadow-none px-0 h-8"
                        />
                        <Input
                          value={line.notes}
                          onChange={setLine(i, 'notes')}
                          placeholder="Notes (ASTM, coil ID, color, gauge…)"
                          className="border-0 shadow-none px-0 h-7 text-xs text-muted-foreground mt-0.5"
                        />
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
                  <td colSpan={4} className="p-3 text-right text-sm font-medium">Subtotal</td>
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
