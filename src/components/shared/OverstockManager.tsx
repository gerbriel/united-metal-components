'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Pencil, Loader2, Package, Archive, ArchiveRestore, Trash2 } from 'lucide-react'
import LinkPoDialog, { type Vendor, type OpenPo } from '@/components/shared/LinkPoDialog'
import OverstockImport from '@/components/shared/OverstockImport'
import { COLORS } from '@/lib/product-config'
import { useFinishes } from '@/lib/useFinishes'
import { submitInventoryRequest } from '@/lib/inventory/requests'

interface OverstockProduct { id: number; name: string; sku: string | null }
interface PanelCoil { id: number; coil_identifier: string; color: string | null }

export interface PanelOverstock {
  id: number
  product_id: number
  color: string | null
  length_ft: number
  length_in: number
  quantity: number
  unit_price: number | null
  coil_id: number | null
  vendor_id: string | null
  po_id: string | null
  notes: string | null
  archived: boolean
  received_at: string
  products?: { name: string } | null
  product_coils?: { coil_identifier: string; color: string | null } | null
}

interface Props {
  initialRows:       PanelOverstock[]
  overstockProducts: OverstockProduct[]
  panelCoils:        PanelCoil[]
  isAdmin:           boolean
  // Office employees add/edit/archive listings and adjust quantity, but those
  // changes go to the approval queue instead of writing panel_overstock.
  isOffice?:         boolean
  vendors:           Vendor[]
  openPos:           OpenPo[]
}

const EMPTY_FORM = {
  product_id: '',
  color:      '',
  length_ft:  '',
  length_in:  '0',
  quantity:   '',
  unit_price: '',
  coil_id:    '',
  notes:      '',
}

// "13' 6"" / "10 ft"
const fmtLen = (ft: number, inches: number) => (inches ? `${ft}' ${inches}"` : `${ft} ft`)

function ColorSwatch({ name }: { name: string | null }) {
  const entry = name ? COLORS.find((c) => c.name === name) : null
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="w-4 h-4 rounded-full border border-slate-200 shrink-0"
        style={entry?.gradient ? { backgroundImage: entry.gradient } : entry ? { backgroundColor: entry.hex } : { backgroundColor: '#e2e8f0' }}
      />
      <span>{name ?? 'No color'}</span>
    </span>
  )
}

export default function OverstockManager({ initialRows, overstockProducts, panelCoils, isAdmin, isOffice = false, vendors, openPos }: Props) {
  const canManage = isAdmin || isOffice
  const palette = useFinishes() // live, staff-editable color palette (falls back to COLORS)
  const [rows, setRows] = useState<PanelOverstock[]>(initialRows)

  // Overstock panels sell under a single catalog product, so the form auto-links
  // to it rather than showing a product picker.
  const productId = overstockProducts[0]?.id ?? null
  const productName = overstockProducts[0]?.name ?? null

  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null) // null = add mode
  const [form, setForm] = useState(EMPTY_FORM)

  const [qtyEditing, setQtyEditing] = useState<number | null>(null)
  const [qtyForm, setQtyForm] = useState('')
  const [qtyLoading, setQtyLoading] = useState(false)

  const [showArchived, setShowArchived] = useState(false)
  const [rowBusy, setRowBusy] = useState<number | null>(null)

  const supabase = createClient()

  const setF = (k: keyof typeof EMPTY_FORM) => (v: string | null) =>
    setForm((f) => ({ ...f, [k]: v ?? '' }))

  const fetchAll = useCallback(async () => {
    const { data } = await supabase
      .from('panel_overstock')
      .select('*, products(name), product_coils(coil_identifier, color)')
      .order('received_at', { ascending: false })
    if (data) setRows(data as PanelOverstock[])
  }, [])

  useEffect(() => {
    const ch = supabase
      .channel('overstock-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'panel_overstock' }, fetchAll)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchAll])

  const rowToForm = (r: PanelOverstock): typeof EMPTY_FORM => ({
    product_id: String(r.product_id),
    color:      r.color ?? '',
    length_ft:  String(r.length_ft),
    length_in:  String(r.length_in),
    quantity:   String(r.quantity),
    unit_price: r.unit_price != null ? String(r.unit_price) : '',
    coil_id:    r.coil_id != null ? String(r.coil_id) : '',
    notes:      r.notes ?? '',
  })

  const openAdd  = () => { setEditingId(null); setForm(EMPTY_FORM); setOpen(true) }
  const openEdit = (r: PanelOverstock) => { setEditingId(r.id); setForm(rowToForm(r)); setOpen(true) }

  // Create (add mode) or update (edit mode) a listing from the shared form.
  const handleSave = async () => {
    const lengthFt = parseInt(form.length_ft)
    const quantity = parseInt(form.quantity)
    if (isNaN(lengthFt) || lengthFt <= 0) { toast.error('Enter a valid length in feet'); return }
    if (isNaN(quantity) || quantity < 0) { toast.error('Enter a valid quantity'); return }
    const payload = {
      color:      form.color || null,
      length_ft:  lengthFt,
      length_in:  form.length_in ? parseInt(form.length_in) : 0,
      quantity,
      unit_price: form.unit_price ? parseFloat(form.unit_price) : null,
      coil_id:    form.coil_id ? parseInt(form.coil_id) : null,
      notes:      form.notes || null,
    }
    const listLabel = `${form.color || 'no color'} · ${fmtLen(lengthFt, payload.length_in)}`

    // Office: everything routes through the approval queue.
    if (isOffice && !isAdmin) {
      if (editingId == null && !productId) { toast.error('No overstock product configured'); setAdding(false); return }
      setAdding(true)
      const { error } = await submitInventoryRequest(supabase, {
        targetTable: 'panel_overstock',
        operation: editingId != null ? 'update' : 'create',
        targetId: editingId ?? null,
        payload: editingId != null ? payload : { product_id: productId, ...payload },
        summary: `${editingId != null ? 'Edit' : 'Add'} overstock listing — ${listLabel}`,
      })
      if (error) { toast.error(error.message); setAdding(false); return }
      toast.success('Submitted for admin approval')
      setOpen(false)
      setEditingId(null)
      setForm(EMPTY_FORM)
      setAdding(false)
      return
    }

    setAdding(true)
    if (editingId != null) {
      const { error } = await supabase.from('panel_overstock').update(payload).eq('id', editingId)
      if (error) { toast.error(error.message); setAdding(false); return }
      toast.success('Overstock listing updated')
    } else {
      if (!productId) { toast.error('No overstock product configured'); setAdding(false); return }
      const { error } = await supabase.from('panel_overstock').insert({ product_id: productId, ...payload })
      if (error) { toast.error(error.message); setAdding(false); return }
      toast.success('Overstock listing added')
    }
    setOpen(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    await fetchAll()
    setAdding(false)
  }

  const handleUpdateQty = async (id: number) => {
    const q = parseInt(qtyForm)
    if (isNaN(q) || q < 0) { toast.error('Enter a valid quantity'); return }
    setQtyLoading(true)
    if (isOffice && !isAdmin) {
      const r = rows.find((x) => x.id === id)
      const { error } = await submitInventoryRequest(supabase, {
        targetTable: 'panel_overstock',
        operation: 'update',
        targetId: id,
        payload: { quantity: q },
        summary: `Set overstock ${r ? `${r.color ?? 'no color'} · ${fmtLen(r.length_ft, r.length_in)}` : `#${id}`} qty to ${q}`,
      })
      if (error) { toast.error(error.message); setQtyLoading(false); return }
      toast.success('Submitted for admin approval')
      setQtyEditing(null)
      setQtyLoading(false)
      return
    }
    const { error } = await supabase.from('panel_overstock').update({ quantity: q }).eq('id', id)
    if (error) { toast.error(error.message); setQtyLoading(false); return }
    toast.success('Quantity updated')
    setQtyEditing(null)
    await fetchAll()
    setQtyLoading(false)
  }

  const setArchived = async (id: number, archived: boolean) => {
    setRowBusy(id)
    if (isOffice && !isAdmin) {
      const r = rows.find((x) => x.id === id)
      const { error } = await submitInventoryRequest(supabase, {
        targetTable: 'panel_overstock',
        operation: archived ? 'archive' : 'restore',
        targetId: id,
        summary: `${archived ? 'Archive' : 'Restore'} overstock ${r ? `${r.color ?? 'no color'} · ${fmtLen(r.length_ft, r.length_in)}` : `#${id}`}`,
      })
      if (error) toast.error(error.message)
      else toast.success('Submitted for admin approval')
      setRowBusy(null)
      return
    }
    const { error } = await supabase.from('panel_overstock').update({ archived }).eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success(archived ? 'Archived' : 'Restored'); await fetchAll() }
    setRowBusy(null)
  }

  const deleteRow = async (r: PanelOverstock) => {
    if (!confirm(`Permanently delete this overstock listing (${r.color ?? 'no color'} · ${fmtLen(r.length_ft, r.length_in)})? This cannot be undone.`)) return
    setRowBusy(r.id)
    const { error } = await supabase.from('panel_overstock').delete().eq('id', r.id)
    if (error) toast.error(error.message)
    else { toast.success('Deleted'); await fetchAll() }
    setRowBusy(null)
  }

  const displayed = rows
    .filter((r) => showArchived || !r.archived)
    .sort((a, b) =>
      (a.color ?? '').localeCompare(b.color ?? '') ||
      a.length_ft - b.length_ft ||
      a.length_in - b.length_in)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-semibold">Overstock Listings</h2>
          <p className="text-xs text-muted-foreground">
            {productName ? <>Sold under <span className="font-medium">{productName}</span> · </> : null}
            each row is a batch of identical pre-made panels
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            Show archived
          </label>
          {isAdmin && (
            <OverstockImport
              overstockProductId={productId}
              onImported={fetchAll}
              triggerLabel="Import from order"
            />
          )}
          {canManage && (
            <button onClick={openAdd} className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/80 transition-colors">
              <Plus className="w-4 h-4" />Add Listing
            </button>
          )}
          {canManage && (
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditingId(null); setForm(EMPTY_FORM) } }}>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>{editingId != null ? 'Edit' : 'Add'} Overstock Listing</DialogTitle></DialogHeader>
                {editingId == null && !productId && (
                  <p className="text-sm text-red-600">No overstock product is configured. Create one in Products first.</p>
                )}
                <div className="grid grid-cols-2 gap-4 py-2">
                  <div className="space-y-1.5 col-span-2">
                    <Label>Color</Label>
                    <Select value={form.color} onValueChange={setF('color')}>
                      <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">— No color (bare) —</SelectItem>
                        {palette.map((c) => (
                          <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Length — Feet *</Label>
                    <Input
                      type="number" min={1}
                      value={form.length_ft}
                      onChange={(e) => setF('length_ft')(e.target.value)}
                      placeholder="e.g. 14"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Length — Inches</Label>
                    <Input
                      type="number" min={0} max={11}
                      value={form.length_in}
                      onChange={(e) => setF('length_in')(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Quantity (pieces) *</Label>
                    <Input
                      type="number" min={0}
                      value={form.quantity}
                      onChange={(e) => setF('quantity')(e.target.value)}
                      placeholder="e.g. 8"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Unit Price (staff-only)</Label>
                    <Input
                      type="number" step="0.01"
                      value={form.unit_price}
                      onChange={(e) => setF('unit_price')(e.target.value)}
                      placeholder="per piece"
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label>Source Coil (optional — traceability)</Label>
                    <Select value={form.coil_id} onValueChange={setF('coil_id')}>
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">— None —</SelectItem>
                        {panelCoils.map((c) => (
                          <SelectItem key={c.id} value={c.id.toString()}>
                            {c.coil_identifier}{c.color ? ` (${c.color})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label>Notes</Label>
                    <Input
                      value={form.notes}
                      onChange={(e) => setF('notes')(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button onClick={handleSave} disabled={adding || (editingId == null && !productId)}>
                    {adding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {editingId != null ? 'Save Changes' : 'Add Listing'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {displayed.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">No overstock listings yet.</p>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-muted-foreground border-b">
                <tr>
                  <th className="text-left p-3">Color</th>
                  <th className="text-left p-3">Length</th>
                  <th className="text-right p-3">Available</th>
                  <th className="text-right p-3">Unit Price</th>
                  <th className="text-left p-3">Source Coil</th>
                  <th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {displayed.map((r) => {
                  const isEditing = qtyEditing === r.id
                  return (
                    <tr key={r.id} className={`${r.archived ? 'opacity-50' : ''} bg-white hover:bg-slate-50 transition-colors`}>
                      <td className="p-3"><ColorSwatch name={r.color} /></td>
                      <td className="p-3 font-medium">{fmtLen(r.length_ft, r.length_in)}</td>
                      <td className="p-3 text-right">
                        {isEditing ? (
                          <Input
                            type="number" min={0}
                            className="h-7 w-20 text-xs text-right ml-auto"
                            value={qtyForm}
                            onChange={(e) => setQtyForm(e.target.value)}
                          />
                        ) : (
                          <span className={`font-mono font-semibold ${r.quantity === 0 ? 'text-red-600' : 'text-green-700'}`}>
                            {r.quantity}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right font-mono">
                        {r.unit_price != null ? `$${Number(r.unit_price).toFixed(2)}` : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="p-3">
                        {r.product_coils?.coil_identifier
                          ? <span className="font-mono text-xs text-muted-foreground">{r.product_coils.coil_identifier}</span>
                          : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      <td className="p-3">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <Button size="sm" className="h-7 text-xs" onClick={() => handleUpdateQty(r.id)} disabled={qtyLoading}>
                              {qtyLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                            </Button>
                            <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setQtyEditing(null)}>Cancel</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Button
                              size="sm" variant="outline" className="h-7 text-xs"
                              onClick={() => { setQtyEditing(r.id); setQtyForm(r.quantity.toString()) }}
                            >
                              <Package className="w-3 h-3 mr-1" />Qty
                            </Button>
                            {canManage && (
                              <Button
                                size="sm" variant="outline" className="h-7 text-xs"
                                onClick={() => openEdit(r)}
                              >
                                <Pencil className="w-3 h-3 mr-1" />Edit
                              </Button>
                            )}
                            {isAdmin && (
                              <LinkPoDialog
                                table="panel_overstock"
                                rowId={r.id}
                                vendors={vendors}
                                openPos={openPos}
                                currentVendorId={r.vendor_id}
                                currentPoId={r.po_id}
                                onLinked={fetchAll}
                              />
                            )}
                            {canManage && (
                              r.archived ? (
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setArchived(r.id, false)} disabled={rowBusy === r.id}>
                                  <ArchiveRestore className="w-3 h-3 mr-1" />Restore
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setArchived(r.id, true)} disabled={rowBusy === r.id}>
                                  <Archive className="w-3 h-3 mr-1" />Archive
                                </Button>
                              )
                            )}
                            {isAdmin && (
                              <Button
                                size="sm" variant="outline"
                                className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => deleteRow(r)}
                                disabled={rowBusy === r.id}
                              >
                                <Trash2 className="w-3 h-3 mr-1" />Delete
                              </Button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
