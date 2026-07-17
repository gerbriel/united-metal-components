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
import { swatchStyle } from '@/lib/product-config'
import { submitInventoryRequest } from '@/lib/inventory/requests'

interface TrimProduct { id: number; name: string; sku: string | null }
// The finish_id picker source — carries the ids trim_stock keys by, plus enough
// swatch info (gradient/texture) to render the chip exactly like other pickers.
interface FinishOption { id: number; name: string; hex: string; gradient?: string | null; texture?: string | null }

export interface TrimStockRow {
  id: number
  product_id: number
  finish_id: number
  qty: number
  notes: string | null
  updated_at: string
  products?: { name: string; sku: string | null } | null
  finishes?: { name: string; hex: string } | null
}

interface Props {
  initialRows:  TrimStockRow[]
  trimProducts: TrimProduct[]
  // Full finishes list (with ids) for the color picker. NOT useFinishes(), which
  // omits finish ids — and trim_stock keys by finish_id.
  finishes:     FinishOption[]
  isAdmin:      boolean
  // Office employees manage stock, but their changes route to the approval queue
  // instead of writing trim_stock directly.
  isOffice?:    boolean
}

const EMPTY_FORM = { product_id: '', finish_id: '', qty: '', notes: '' }

export default function TrimStockManager({ initialRows, trimProducts, finishes, isAdmin, isOffice = false }: Props) {
  const canManage = isAdmin || isOffice
  const [rows, setRows] = useState<TrimStockRow[]>(initialRows)

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

  const finishById = (id: number) => finishes.find((f) => f.id === id)
  // Swatch style for a row's finish — prefer the full finishes prop (gradient /
  // texture aware); fall back to the joined hex if the finish is no longer active.
  const rowSwatch = (r: TrimStockRow) => {
    const f = finishById(r.finish_id)
    return swatchStyle(
      f ? { hex: f.hex, gradient: f.gradient ?? undefined, texture: f.texture ?? undefined }
        : r.finishes ? { hex: r.finishes.hex } : null,
    )
  }
  const finishLabel = (r: TrimStockRow) => finishById(r.finish_id)?.name ?? r.finishes?.name ?? `Finish ${r.finish_id}`
  const productLabel = (r: TrimStockRow) => r.products?.name ?? `#${r.product_id}`

  const fetchAll = useCallback(async () => {
    const { data } = await supabase
      .from('trim_stock')
      .select('*, products(name, sku), finishes(name, hex)')
      .order('updated_at', { ascending: false })
    if (data) setRows(data as TrimStockRow[])
  }, [])

  // Keep the list live so admins see office-approved changes as they land.
  useEffect(() => {
    const ch = supabase
      .channel('trim-stock-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trim_stock' }, fetchAll)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchAll])

  const closeDialog = () => { setOpen(false); setEditingId(null); setForm(EMPTY_FORM) }
  const openAdd  = () => { setEditingId(null); setForm(EMPTY_FORM) }
  const openEdit = (r: TrimStockRow) => {
    setEditingId(r.id)
    setForm({ product_id: String(r.product_id), finish_id: String(r.finish_id), qty: String(r.qty), notes: r.notes ?? '' })
    setOpen(true)
  }

  const editing = editingId != null ? rows.find((r) => r.id === editingId) ?? null : null

  // Create (add mode) or update (edit mode) a trim_stock row from the shared form.
  const handleSave = async () => {
    const qty = parseInt(form.qty)
    if (isNaN(qty) || qty < 0) { toast.error('Enter a valid quantity'); return }

    // Product + finish are fixed to the row in edit mode (they form the unique key).
    const product_id = editing ? editing.product_id : parseInt(form.product_id)
    const finish_id  = editing ? editing.finish_id  : parseInt(form.finish_id)
    if (!product_id || isNaN(product_id)) { toast.error('Pick a trim product'); return }
    if (!finish_id  || isNaN(finish_id))  { toast.error('Pick a color'); return }

    // (product, finish) is UNIQUE — adding a pair that already exists is an edit.
    const existing = editing ?? rows.find((r) => r.product_id === product_id && r.finish_id === finish_id) ?? null
    const notes = form.notes || null

    const pName = editing?.products?.name ?? trimProducts.find((p) => p.id === product_id)?.name ?? `#${product_id}`
    const fName = finishById(finish_id)?.name ?? editing?.finishes?.name ?? `finish ${finish_id}`
    const label = `${pName} · ${fName}`

    // Office: route through the approval queue.
    if (isOffice && !isAdmin) {
      setAdding(true)
      const { error } = await submitInventoryRequest(supabase, {
        targetTable: 'trim_stock',
        operation: existing ? 'update' : 'create',
        targetId: existing ? existing.id : null,
        payload: existing ? { qty, notes } : { product_id, finish_id, qty, notes },
        summary: `${existing ? 'Set' : 'Add'} trim stock — ${label} × ${qty}`,
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
      const { error } = await supabase.from('trim_stock').update({ qty, notes }).eq('id', existing.id)
      if (error) { toast.error(error.message); setAdding(false); return }
      toast.success('Trim stock updated')
    } else {
      const { error } = await supabase
        .from('trim_stock')
        .upsert({ product_id, finish_id, qty, notes }, { onConflict: 'product_id,finish_id' })
      if (error) { toast.error(error.message); setAdding(false); return }
      toast.success('Trim stock added')
    }
    closeDialog()
    await fetchAll()
    setAdding(false)
  }

  const handleUpdateQty = async (r: TrimStockRow) => {
    const q = parseInt(qtyForm)
    if (isNaN(q) || q < 0) { toast.error('Enter a valid quantity'); return }
    setQtyLoading(true)
    const label = `${productLabel(r)} · ${finishLabel(r)}`
    if (isOffice && !isAdmin) {
      const { error } = await submitInventoryRequest(supabase, {
        targetTable: 'trim_stock',
        operation: 'update',
        targetId: r.id,
        payload: { qty: q },
        summary: `Set trim ${label} qty to ${q}`,
      })
      if (error) { toast.error(error.message); setQtyLoading(false); return }
      toast.success('Submitted for admin approval')
      setQtyEditing(null)
      setQtyLoading(false)
      return
    }
    const { error } = await supabase.from('trim_stock').update({ qty: q }).eq('id', r.id)
    if (error) { toast.error(error.message); setQtyLoading(false); return }
    toast.success('Quantity updated')
    setQtyEditing(null)
    await fetchAll()
    setQtyLoading(false)
  }

  // trim_stock has no `archived` column, so admins remove a row outright. Office
  // employees instead zero out the qty through the queue (the inline Qty editor).
  const deleteRow = async (r: TrimStockRow) => {
    const label = `${productLabel(r)} · ${finishLabel(r)}`
    if (!confirm(`Permanently delete trim stock for ${label}? This cannot be undone.`)) return
    setRowBusy(r.id)
    const { error } = await supabase.from('trim_stock').delete().eq('id', r.id)
    if (error) toast.error(error.message)
    else { toast.success('Deleted'); await fetchAll() }
    setRowBusy(null)
  }

  const displayed = [...rows].sort((a, b) =>
    productLabel(a).localeCompare(productLabel(b)) ||
    finishLabel(a).localeCompare(finishLabel(b)))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-semibold">Trim Stock</h2>
          <p className="text-xs text-muted-foreground">Pre-cut trim pieces on hand, counted per color</p>
        </div>
        {canManage && (
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditingId(null); setForm(EMPTY_FORM) } }}>
            <DialogTrigger render={
              <button
                onClick={openAdd}
                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/80 transition-colors"
              >
                <Plus className="w-4 h-4" />Add Trim Stock
              </button>
            } />
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>{editingId != null ? 'Edit' : 'Add'} Trim Stock</DialogTitle></DialogHeader>
              {editingId == null && trimProducts.length === 0 && (
                <p className="text-sm text-red-600">No trim products are configured. Add one in Products first.</p>
              )}
              <div className="grid gap-4 py-2">
                <div className="space-y-1.5">
                  <Label>Trim Product *</Label>
                  {editing ? (
                    <p className="text-sm font-medium">
                      {editing.products?.name ?? `#${editing.product_id}`}
                      {editing.products?.sku ? <span className="text-muted-foreground font-normal"> ({editing.products.sku})</span> : null}
                    </p>
                  ) : (
                    <Select value={form.product_id} onValueChange={setF('product_id')}>
                      <SelectTrigger><SelectValue placeholder="Select trim…" /></SelectTrigger>
                      <SelectContent>
                        {trimProducts.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.name}{p.sku ? ` (${p.sku})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Color *</Label>
                  {editing ? (
                    <span className="inline-flex items-center gap-1.5 text-sm">
                      <span className="w-4 h-4 rounded-full border border-slate-200 shrink-0" style={rowSwatch(editing)} />
                      {finishLabel(editing)}
                    </span>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-2">
                        {finishes.map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            title={f.name}
                            onClick={() => setF('finish_id')(String(f.id))}
                            className={[
                              'w-9 h-9 rounded-full border-2 transition-all overflow-hidden',
                              form.finish_id === String(f.id)
                                ? 'border-primary scale-110 shadow-md ring-2 ring-primary/30'
                                : 'border-white shadow-sm hover:scale-105 hover:border-primary/60',
                            ].join(' ')}
                            style={swatchStyle({ hex: f.hex, gradient: f.gradient ?? undefined, texture: f.texture ?? undefined })}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {form.finish_id
                          ? <>Selected: <span className="font-medium text-foreground">{finishById(parseInt(form.finish_id))?.name ?? form.finish_id}</span></>
                          : 'Pick a color'}
                      </p>
                    </>
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
                  disabled={adding || (editingId == null && (!form.product_id || !form.finish_id))}
                >
                  {adding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingId != null ? 'Save Changes' : 'Add Trim Stock'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {displayed.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">No trim stock recorded yet.</p>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-muted-foreground border-b">
                <tr>
                  <th className="text-left p-3">Trim</th>
                  <th className="text-left p-3">Color</th>
                  <th className="text-right p-3">On Hand</th>
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
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full border border-slate-200 shrink-0" style={rowSwatch(r)} />
                          <span>{finishLabel(r)}</span>
                        </span>
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
