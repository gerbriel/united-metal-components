'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Pencil, Loader2, Package, Trash2 } from 'lucide-react'
import { hatBraceLengthsFor } from '@/lib/product-config'
import { submitInventoryRequest } from '@/lib/inventory/requests'

interface HatBraceProduct { id: number; name: string; sku: string | null }
// The coil_id picker source — the shared hat_channel_brace coil pool these
// pieces are cut from. Only enough to render the option + traceability chip.
interface CoilOption { id: number; coil_identifier: string }

export interface HatBraceStockRow {
  id: number
  product_id: number
  length_ft: number
  qty: number
  coil_id: number | null
  notes: string | null
  updated_at: string
  products?: { name: string; sku: string | null } | null
  product_coils?: { coil_identifier: string } | null
}

interface Props {
  initialRows:      HatBraceStockRow[]
  hatBraceProducts: HatBraceProduct[]
  // The hat_channel_brace coils, for the optional source-coil picker.
  coils:            CoilOption[]
  isAdmin:          boolean
  // Office employees manage stock, but their changes route to the approval queue
  // instead of writing hat_brace_stock directly.
  isOffice?:        boolean
}

const EMPTY_FORM = { product_id: '', length_ft: '', coil_id: '', qty: '', notes: '' }

export default function HatBraceStockManager({ initialRows, hatBraceProducts, coils, isAdmin, isOffice = false }: Props) {
  const canManage = isAdmin || isOffice
  const [rows, setRows] = useState<HatBraceStockRow[]>(initialRows)

  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null) // null = add mode
  const [form, setForm] = useState(EMPTY_FORM)

  const [qtyEditing, setQtyEditing] = useState<number | null>(null)
  const [qtyForm, setQtyForm] = useState('')
  const [qtyLoading, setQtyLoading] = useState(false)

  const [rowBusy, setRowBusy] = useState<number | null>(null)

  const supabase = createClient()

  const setF = (k: keyof typeof EMPTY_FORM) => (v: string | null) =>
    setForm((f) => ({ ...f, [k]: v ?? '' }))

  const productById = (id: number) => hatBraceProducts.find((p) => p.id === id)
  // Preset cut lengths offered for the product picked in the add dialog.
  const lengthOptions = form.product_id
    ? hatBraceLengthsFor(productById(parseInt(form.product_id))?.sku)
    : []

  const productLabel = (r: HatBraceStockRow) => r.products?.name ?? `#${r.product_id}`
  const lengthLabel  = (r: HatBraceStockRow) => `${r.length_ft} ft`
  const coilLabel    = (r: HatBraceStockRow) => r.product_coils?.coil_identifier ?? '—'

  const fetchAll = useCallback(async () => {
    const { data } = await supabase
      .from('hat_brace_stock')
      .select('*, products(name, sku), product_coils(coil_identifier)')
      .order('updated_at', { ascending: false })
    if (data) setRows(data as HatBraceStockRow[])
  }, [])

  // Keep the list live so admins see office-approved changes as they land.
  useEffect(() => {
    const ch = supabase
      .channel('hat-brace-stock-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hat_brace_stock' }, fetchAll)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchAll])

  const closeDialog = () => { setOpen(false); setEditingId(null); setForm(EMPTY_FORM) }
  const openAdd  = () => { setEditingId(null); setForm(EMPTY_FORM) }
  const openEdit = (r: HatBraceStockRow) => {
    setEditingId(r.id)
    setForm({
      product_id: String(r.product_id),
      length_ft:  String(r.length_ft),
      coil_id:    r.coil_id != null ? String(r.coil_id) : '',
      qty:        String(r.qty),
      notes:      r.notes ?? '',
    })
    setOpen(true)
  }

  // Picking a product in add mode resets the length — the preset lengths differ
  // per SKU (hat channel vs brace), so a carried-over length may be invalid.
  const onProductChange = (v: string | null) =>
    setForm((f) => ({ ...f, product_id: v ?? '', length_ft: '' }))

  const editing = editingId != null ? rows.find((r) => r.id === editingId) ?? null : null

  // Create (add mode) or update (edit mode) a hat_brace_stock row from the form.
  const handleSave = async () => {
    const qty = parseInt(form.qty)
    if (isNaN(qty) || qty < 0) { toast.error('Enter a valid quantity'); return }

    // Product + length are fixed to the row in edit mode (they form the unique key).
    const product_id = editing ? editing.product_id : parseInt(form.product_id)
    const length_ft  = editing ? editing.length_ft  : parseInt(form.length_ft)
    if (!product_id || isNaN(product_id)) { toast.error('Pick a hat/brace product'); return }
    if (!length_ft  || isNaN(length_ft))  { toast.error('Pick a length'); return }

    // (product, length) is UNIQUE — adding a pair that already exists is an edit.
    const existing = editing ?? rows.find((r) => r.product_id === product_id && r.length_ft === length_ft) ?? null
    const coil_id = form.coil_id ? parseInt(form.coil_id) : null
    const notes = form.notes || null

    const pName = editing?.products?.name ?? productById(product_id)?.name ?? `#${product_id}`
    const label = `${pName} · ${length_ft} ft`

    // Office: route through the approval queue.
    if (isOffice && !isAdmin) {
      setAdding(true)
      const { error } = await submitInventoryRequest(supabase, {
        targetTable: 'hat_brace_stock',
        operation: existing ? 'update' : 'create',
        targetId: existing ? existing.id : null,
        payload: existing ? { qty, coil_id, notes } : { product_id, length_ft, qty, coil_id, notes },
        summary: `${existing ? 'Set' : 'Add'} hat/brace stock — ${label} × ${qty}`,
      })
      if (error) { toast.error(error.message); setAdding(false); return }
      toast.success('Submitted for admin approval')
      closeDialog()
      setAdding(false)
      return
    }

    // Admin / warehouse: write directly.
    setAdding(true)
    if (existing) {
      const { error } = await supabase.from('hat_brace_stock').update({ qty, coil_id, notes }).eq('id', existing.id)
      if (error) { toast.error(error.message); setAdding(false); return }
      toast.success('Hat/brace stock updated')
    } else {
      const { error } = await supabase
        .from('hat_brace_stock')
        .upsert({ product_id, length_ft, qty, coil_id, notes }, { onConflict: 'product_id,length_ft' })
      if (error) { toast.error(error.message); setAdding(false); return }
      toast.success('Hat/brace stock added')
    }
    closeDialog()
    await fetchAll()
    setAdding(false)
  }

  const handleUpdateQty = async (r: HatBraceStockRow) => {
    const q = parseInt(qtyForm)
    if (isNaN(q) || q < 0) { toast.error('Enter a valid quantity'); return }
    setQtyLoading(true)
    const label = `${productLabel(r)} · ${lengthLabel(r)}`
    if (isOffice && !isAdmin) {
      const { error } = await submitInventoryRequest(supabase, {
        targetTable: 'hat_brace_stock',
        operation: 'update',
        targetId: r.id,
        payload: { qty: q },
        summary: `Set hat/brace ${label} qty to ${q}`,
      })
      if (error) { toast.error(error.message); setQtyLoading(false); return }
      toast.success('Submitted for admin approval')
      setQtyEditing(null)
      setQtyLoading(false)
      return
    }
    const { error } = await supabase.from('hat_brace_stock').update({ qty: q }).eq('id', r.id)
    if (error) { toast.error(error.message); setQtyLoading(false); return }
    toast.success('Quantity updated')
    setQtyEditing(null)
    await fetchAll()
    setQtyLoading(false)
  }

  // hat_brace_stock has no `archived` column, so admins remove a row outright.
  // Office employees instead zero out the qty through the queue (inline Qty editor).
  const deleteRow = async (r: HatBraceStockRow) => {
    const label = `${productLabel(r)} · ${lengthLabel(r)}`
    if (!confirm(`Permanently delete hat/brace stock for ${label}? This cannot be undone.`)) return
    setRowBusy(r.id)
    const { error } = await supabase.from('hat_brace_stock').delete().eq('id', r.id)
    if (error) toast.error(error.message)
    else { toast.success('Deleted'); await fetchAll() }
    setRowBusy(null)
  }

  const displayed = [...rows].sort((a, b) =>
    productLabel(a).localeCompare(productLabel(b)) ||
    a.length_ft - b.length_ft)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-semibold">Hat / Brace Stock</h2>
          <p className="text-xs text-muted-foreground">Pre-cut hat-channel and brace pieces on hand, counted per length</p>
        </div>
        {canManage && (
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditingId(null); setForm(EMPTY_FORM) } }}>
            <DialogTrigger render={
              <button
                onClick={openAdd}
                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/80 transition-colors"
              >
                <Plus className="w-4 h-4" />Add Hat/Brace Stock
              </button>
            } />
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>{editingId != null ? 'Edit' : 'Add'} Hat/Brace Stock</DialogTitle></DialogHeader>
              {editingId == null && hatBraceProducts.length === 0 && (
                <p className="text-sm text-red-600">No hat/brace products are configured. Add one in Products first.</p>
              )}
              <div className="grid gap-4 py-2">
                <div className="space-y-1.5">
                  <Label>Hat/Brace Product *</Label>
                  {editing ? (
                    <p className="text-sm font-medium">
                      {editing.products?.name ?? `#${editing.product_id}`}
                      {editing.products?.sku ? <span className="text-muted-foreground font-normal"> ({editing.products.sku})</span> : null}
                    </p>
                  ) : (
                    <Select value={form.product_id} onValueChange={onProductChange}>
                      <SelectTrigger><SelectValue placeholder="Select product…" /></SelectTrigger>
                      <SelectContent>
                        {hatBraceProducts.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.name}{p.sku ? ` (${p.sku})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Length *</Label>
                  {editing ? (
                    <p className="text-sm font-medium">{editing.length_ft} ft</p>
                  ) : (
                    <Select value={form.length_ft} onValueChange={setF('length_ft')} disabled={!form.product_id}>
                      <SelectTrigger><SelectValue placeholder={form.product_id ? 'Select length…' : 'Pick a product first'} /></SelectTrigger>
                      <SelectContent>
                        {lengthOptions.map((len) => (
                          <SelectItem key={len} value={String(len)}>{len} ft</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Quantity (pieces) *</Label>
                  <Input
                    type="number" min={0}
                    value={form.qty}
                    onChange={(e) => setF('qty')(e.target.value)}
                    placeholder="e.g. 12"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Source Coil (optional — traceability)</Label>
                  <Select value={form.coil_id} onValueChange={setF('coil_id')}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">— None —</SelectItem>
                      {coils.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>{c.coil_identifier}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Input
                    value={form.notes}
                    onChange={(e) => setF('notes')(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                <Button
                  onClick={handleSave}
                  disabled={adding || (editingId == null && (!form.product_id || !form.length_ft))}
                >
                  {adding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingId != null ? 'Save Changes' : 'Add Hat/Brace Stock'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {displayed.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">No hat/brace stock recorded yet.</p>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-muted-foreground border-b">
                <tr>
                  <th className="text-left p-3">Product</th>
                  <th className="text-left p-3">Length</th>
                  <th className="text-right p-3">On Hand</th>
                  <th className="text-left p-3">Source Coil</th>
                  <th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {displayed.map((r) => {
                  const isEditing = qtyEditing === r.id
                  return (
                    <tr key={r.id} className="bg-white hover:bg-slate-50 transition-colors">
                      <td className="p-3">
                        <span className="font-medium">{productLabel(r)}</span>
                        {r.products?.sku ? <span className="text-xs text-muted-foreground ml-1.5 font-mono">{r.products.sku}</span> : null}
                      </td>
                      <td className="p-3">
                        <span className="font-medium">{lengthLabel(r)}</span>
                      </td>
                      <td className="p-3 text-right">
                        {isEditing ? (
                          <Input
                            type="number" min={0}
                            className="h-7 w-20 text-xs text-right ml-auto"
                            value={qtyForm}
                            onChange={(e) => setQtyForm(e.target.value)}
                          />
                        ) : (
                          <span className={`font-mono font-semibold ${r.qty === 0 ? 'text-red-600' : 'text-green-700'}`}>
                            {r.qty}
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {r.product_coils?.coil_identifier
                          ? <span className="font-mono text-xs text-muted-foreground">{coilLabel(r)}</span>
                          : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="p-3">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <Button size="sm" className="h-7 text-xs" onClick={() => handleUpdateQty(r)} disabled={qtyLoading}>
                              {qtyLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                            </Button>
                            <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setQtyEditing(null)}>Cancel</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {canManage && (
                              <Button
                                size="sm" variant="outline" className="h-7 text-xs"
                                onClick={() => { setQtyEditing(r.id); setQtyForm(r.qty.toString()) }}
                              >
                                <Package className="w-3 h-3 mr-1" />Qty
                              </Button>
                            )}
                            {canManage && (
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEdit(r)}>
                                <Pencil className="w-3 h-3 mr-1" />Edit
                              </Button>
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
