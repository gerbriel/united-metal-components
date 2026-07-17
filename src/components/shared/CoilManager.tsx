'use client'

import { useEffect, useState, useCallback, Fragment } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Loader2, Scale, Pencil, Archive, ArchiveRestore, Trash2, ChevronRight, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { COLORS } from '@/lib/product-config'
import { useFinishes } from '@/lib/useFinishes'
import LinkPoDialog, { type Vendor, type OpenPo } from '@/components/shared/LinkPoDialog'
import { panelSupplyByColor, type DemandItem, type OrderAllocation } from '@/lib/coilSupply'
import { submitInventoryRequest } from '@/lib/inventory/requests'

export interface CoilRow {
  id: number
  coil_identifier: string
  coil_category: 'panel' | 'hat_channel_brace' | 'tube'
  gauge: '12' | '14' | null
  color: string | null
  astm_code: string | null
  initial_weight_lbs: number
  current_weight_lbs: number | null
  lbs_per_linear_foot: number
  status: 'active' | 'depleted' | 'on_hold'
  notes: string | null
  received_at: string
  last_weighed_at: string | null
  archived: boolean
  vendor_id: string | null
  po_id: string | null
}

interface Props {
  initialCoils: CoilRow[]
  isAdmin: boolean
  // Office employees add/edit/archive coils, but changes go to approval first.
  isOffice?: boolean
  vendors: Vendor[]
  openPos: OpenPo[]
  demand: DemandItem[]
  colorsOnOrder?: string[]
  allocations?: Record<string, OrderAllocation[]>
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  ready_for_pickup: 'Ready',
  loading: 'Loading',
}

const colorHex = (name: string) => COLORS.find((c) => c.name === name)?.hex ?? '#94a3b8'

const CATEGORY_LABELS: Record<string, string> = {
  panel:             'Panel',
  hat_channel_brace: 'Hat Channel / Brace',
  tube:              'Tube',
}

const CATEGORY_BADGE: Record<string, string> = {
  panel:             'bg-blue-100 text-blue-700 border-blue-200',
  hat_channel_brace: 'bg-purple-100 text-purple-700 border-purple-200',
  tube:              'bg-orange-100 text-orange-700 border-orange-200',
}

function totalFeet(coil: CoilRow) {
  return coil.initial_weight_lbs / coil.lbs_per_linear_foot
}

function remainingFeet(coil: CoilRow) {
  const w = coil.current_weight_lbs ?? coil.initial_weight_lbs
  return w / coil.lbs_per_linear_foot
}

function fmtFeet(feet: number): string {
  const f = Math.floor(feet)
  const inches = Math.round((feet - f) * 12)
  if (inches === 0)  return `${f.toLocaleString()} ft`
  if (inches === 12) return `${(f + 1).toLocaleString()} ft`
  return `${f.toLocaleString()} ft ${inches} in`
}

const EMPTY_FORM = {
  coil_identifier: '',
  coil_category: 'panel' as 'panel' | 'hat_channel_brace' | 'tube',
  gauge: '' as '12' | '14' | '',
  color: '',
  astm_code: '',
  initial_weight_lbs: '',
  lbs_per_linear_foot: '',
  notes: '',
}

export default function CoilManager({ initialCoils, isAdmin, isOffice = false, vendors, openPos, demand, colorsOnOrder = [], allocations = {} }: Props) {
  const palette = useFinishes() // live, staff-editable color palette (falls back to COLORS)
  const canManage = isAdmin || isOffice
  const [expandedColor, setExpandedColor] = useState<string | null>(null)
  const [coils, setCoils]               = useState<CoilRow[]>(initialCoils)
  const [addOpen, setAddOpen]           = useState(false)
  const [addLoading, setAddLoading]     = useState(false)
  const [editingId, setEditingId]       = useState<number | null>(null)
  const [form, setForm]                 = useState(EMPTY_FORM)
  const [weightEditing, setWeightEditing] = useState<number | null>(null)
  const [weightInput, setWeightInput]     = useState('')
  const [weightLoading, setWeightLoading] = useState(false)
  const [statusLoading, setStatusLoading] = useState<number | null>(null)
  const [rowBusy, setRowBusy]           = useState<number | null>(null)
  const [filter, setFilter]             = useState('all')
  const [showArchived, setShowArchived] = useState(false)
  const supabase = createClient()

  const fetchCoils = useCallback(async () => {
    const { data } = await supabase
      .from('product_coils')
      .select('*')
      .order('received_at', { ascending: false })
    if (data) setCoils(data as CoilRow[])
  }, [])

  useEffect(() => {
    const ch = supabase
      .channel('coils-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_coils' }, fetchCoils)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchCoils])

  const setF = (k: keyof typeof EMPTY_FORM) => (v: string | null) =>
    setForm((f) => ({ ...f, [k]: v ?? '' }))

  const handleCategoryChange = (v: string | null) => {
    const cat = (v ?? 'panel') as typeof EMPTY_FORM.coil_category
    setForm((f) => ({
      ...f,
      coil_category: cat,
      color: cat === 'hat_channel_brace' ? '' : f.color,
      gauge: cat === 'tube' ? f.gauge : '',
    }))
  }

  const openAdd = () => { setEditingId(null); setForm(EMPTY_FORM); setAddOpen(true) }
  const openEdit = (c: CoilRow) => {
    setEditingId(c.id)
    setForm({
      coil_identifier: c.coil_identifier,
      coil_category: c.coil_category,
      gauge: c.gauge ?? '',
      color: c.color ?? '',
      astm_code: c.astm_code ?? '',
      initial_weight_lbs: c.initial_weight_lbs.toString(),
      lbs_per_linear_foot: c.lbs_per_linear_foot.toString(),
      notes: c.notes ?? '',
    })
    setAddOpen(true)
  }

  const handleSave = async () => {
    if (!form.coil_identifier || !form.initial_weight_lbs || !form.lbs_per_linear_foot) {
      toast.error('Coil ID, initial weight, and lbs/ft are required')
      return
    }
    if (form.coil_category === 'tube' && !form.gauge) {
      toast.error('Gauge is required for tube coils')
      return
    }
    setAddLoading(true)
    const payload = {
      coil_identifier:     form.coil_identifier,
      coil_category:       form.coil_category,
      gauge:               form.coil_category === 'tube' ? form.gauge || null : null,
      color:               form.coil_category === 'hat_channel_brace' ? null : form.color || null,
      astm_code:           form.astm_code || null,
      initial_weight_lbs:  parseFloat(form.initial_weight_lbs),
      lbs_per_linear_foot: parseFloat(form.lbs_per_linear_foot),
      notes:               form.notes || null,
    }

    // Office: submit the add/edit for admin approval instead of writing directly.
    if (isOffice && !isAdmin) {
      const { error } = await submitInventoryRequest(supabase, {
        targetTable: 'product_coils',
        operation: editingId ? 'update' : 'create',
        targetId: editingId ?? null,
        payload,
        summary: `${editingId ? 'Edit' : 'Add'} coil ${form.coil_identifier}${form.color ? ` — ${form.color}` : ''}`,
      })
      if (error) { toast.error(error.message); setAddLoading(false); return }
      toast.success('Submitted for admin approval')
      setAddOpen(false)
      setForm(EMPTY_FORM)
      setEditingId(null)
      setAddLoading(false)
      return
    }

    const { error } = editingId
      ? await supabase.from('product_coils').update(payload).eq('id', editingId)
      : await supabase.from('product_coils').insert(payload)
    if (error) { toast.error(error.message); setAddLoading(false); return }
    toast.success(editingId ? 'Coil updated' : 'Coil added')
    setAddOpen(false)
    setForm(EMPTY_FORM)
    setEditingId(null)
    await fetchCoils()
    setAddLoading(false)
  }

  const setArchived = async (coilId: number, archived: boolean) => {
    setRowBusy(coilId)
    if (isOffice && !isAdmin) {
      const coil = coils.find((c) => c.id === coilId)
      const { error } = await submitInventoryRequest(supabase, {
        targetTable: 'product_coils',
        operation: archived ? 'archive' : 'restore',
        targetId: coilId,
        summary: `${archived ? 'Archive' : 'Restore'} coil ${coil?.coil_identifier ?? coilId}`,
      })
      if (error) toast.error(error.message)
      else toast.success('Submitted for admin approval')
      setRowBusy(null)
      return
    }
    const { error } = await supabase.from('product_coils').update({ archived }).eq('id', coilId)
    if (error) toast.error(error.message)
    else { toast.success(archived ? 'Archived' : 'Restored'); await fetchCoils() }
    setRowBusy(null)
  }

  const hardDelete = async (c: CoilRow) => {
    if (!confirm(`Permanently delete coil "${c.coil_identifier}"? This cannot be undone.`)) return
    setRowBusy(c.id)
    const { error } = await supabase.from('product_coils').delete().eq('id', c.id)
    if (error) toast.error(error.message)
    else { toast.success('Deleted'); await fetchCoils() }
    setRowBusy(null)
  }

  const handleUpdateWeight = async (coilId: number, currentWeight: number | null) => {
    const w = parseFloat(weightInput)
    if (isNaN(w) || w < 0) { toast.error('Enter a valid weight'); return }
    setWeightLoading(true)

    if (isAdmin) {
      // Admin: apply directly
      const { error } = await supabase
        .from('product_coils')
        .update({ current_weight_lbs: w, last_weighed_at: new Date().toISOString() })
        .eq('id', coilId)
      if (error) { toast.error(error.message); setWeightLoading(false); return }
      toast.success('Weight updated')
    } else {
      // Warehouse: submit for approval
      const { error } = await supabase.from('inventory_entries').insert({
        entry_type: 'coil_weight',
        coil_id:    coilId,
        old_value:  currentWeight,
        new_value:  w,
      })
      if (error) { toast.error(error.message); setWeightLoading(false); return }
      toast.success('Weight update submitted for admin approval')
    }

    setWeightEditing(null)
    setWeightInput('')
    await fetchCoils()
    setWeightLoading(false)
  }

  const handleStatus = async (coilId: number, status: 'active' | 'depleted' | 'on_hold') => {
    setStatusLoading(coilId)
    const { error } = await supabase.from('product_coils').update({ status }).eq('id', coilId)
    if (error) toast.error(error.message)
    else { toast.success('Updated'); await fetchCoils() }
    setStatusLoading(null)
  }

  // Preview footage as user types weight
  const weightPreview = (coil: CoilRow): string | null => {
    if (weightEditing !== coil.id) return null
    const w = parseFloat(weightInput)
    if (isNaN(w) || w < 0) return null
    return fmtFeet(w / coil.lbs_per_linear_foot)
  }

  const estFootage = form.initial_weight_lbs && form.lbs_per_linear_foot
    ? fmtFeet(parseFloat(form.initial_weight_lbs) / parseFloat(form.lbs_per_linear_foot))
    : null

  const FILTERS = ['all', 'panel', 'hat_channel_brace', 'tube']
  const displayed = coils
    .filter((c) => showArchived || !c.archived)
    .filter((c) => filter === 'all' || c.coil_category === filter)

  // Live per-color supply vs open-order demand for panel coils. Recomputes as
  // coils are weighed (realtime), so the net figure reflects the latest weights.
  const supply = panelSupplyByColor(coils, demand)
  const onOrder = new Set(colorsOnOrder)

  return (
    <div className="space-y-4">
      {/* Panel supply vs open-order demand, by color */}
      {supply.length > 0 && (
        <div className="border rounded-xl overflow-hidden">
          <div className="bg-slate-50 border-b px-3 py-2">
            <p className="text-sm font-semibold">Panel Supply by Color</p>
            <p className="text-xs text-muted-foreground">
              Estimated footage on hand (measured where weighed, initial footage where not) vs footage committed to open orders.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-muted-foreground border-b">
                <tr>
                  <th className="text-left p-3">Color</th>
                  <th className="text-right p-3">Coils</th>
                  <th className="text-right p-3">Weighed</th>
                  <th className="text-right p-3">Unweighed (est)</th>
                  <th className="text-right p-3">Est. on hand</th>
                  <th className="text-right p-3">Committed</th>
                  <th className="text-right p-3">Net free</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {supply.map((s) => {
                  const orders = allocations[s.color] ?? []
                  const isOpen = expandedColor === s.color
                  return (
                  <Fragment key={s.color}>
                  <tr className="bg-white">
                    <td className="p-3">
                      <span className="inline-flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full border border-slate-300" style={{ backgroundColor: colorHex(s.color) }} />
                        {s.color}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono">{s.coilCount}</td>
                    <td className="p-3 text-right font-mono">{fmtFeet(s.weighedFeet)}</td>
                    <td className="p-3 text-right font-mono text-muted-foreground">
                      {s.unweighedEstFeet > 0 ? fmtFeet(s.unweighedEstFeet) : '—'}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {fmtFeet(s.estOnHandFeet)}
                      {s.hasUnweighed && <span className="text-amber-500 ml-1" title="Includes unweighed estimate">*</span>}
                    </td>
                    <td className="p-3 text-right font-mono text-muted-foreground">
                      {orders.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => setExpandedColor(isOpen ? null : s.color)}
                          className="inline-flex items-center gap-1 hover:text-foreground"
                          title={`${orders.length} order${orders.length === 1 ? '' : 's'} allocated`}
                        >
                          {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          {fmtFeet(s.committedFeet)}
                          <span className="text-[11px] font-sans">({orders.length})</span>
                        </button>
                      ) : (
                        fmtFeet(s.committedFeet)
                      )}
                    </td>
                    <td className={`p-3 text-right font-mono font-semibold ${s.netFeet < 0 ? 'text-red-600' : 'text-green-700'}`}>
                      {s.netFeet < 0 ? `-${fmtFeet(-s.netFeet)}` : fmtFeet(s.netFeet)}
                      {s.netFeet < 0 && (
                        <span className={`block text-[11px] font-sans font-medium ${onOrder.has(s.color) ? 'text-blue-600' : 'text-amber-600'}`}>
                          {onOrder.has(s.color) ? 'On order' : 'Needs ordering'}
                        </span>
                      )}
                    </td>
                  </tr>
                  {isOpen && orders.length > 0 && (
                    <tr className="bg-slate-50/60">
                      <td colSpan={7} className="px-3 py-2">
                        <p className="text-xs text-muted-foreground mb-1.5">Allocated to open orders</p>
                        <div className="flex flex-wrap gap-1.5">
                          {orders.map((o) => (
                            <Link
                              key={o.orderId}
                              href={`/dashboard/orders/${o.orderId}`}
                              className="inline-flex items-center gap-1.5 rounded-md border bg-white px-2 py-1 text-xs hover:border-primary hover:text-primary"
                            >
                              <span className="font-medium">Order #{o.orderId}</span>
                              <span className="text-muted-foreground">{STATUS_LABELS[o.status] ?? o.status}</span>
                              <span className="font-mono">{fmtFeet(o.feet)}</span>
                            </Link>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground px-3 py-2 border-t">
            <span className="text-amber-500">*</span> estimate includes coils not yet weighed (uses initial footage). Weigh coils for an exact figure.
            Expand a <span className="font-medium">Committed</span> figure to see which open orders it's allocated to.
            Colors in the red show <span className="text-blue-600 font-medium">On order</span> when they already appear on an open
            purchase order, or <span className="text-amber-600 font-medium">Needs ordering</span> otherwise.
          </p>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                filter === f
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:bg-muted text-muted-foreground'
              }`}
            >
              {f === 'all' ? 'All' : CATEGORY_LABELS[f]}
            </button>
          ))}
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground ml-1">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            Show archived
          </label>
        </div>

        {canManage && (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger render={
              <button
                onClick={openAdd}
                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/80 transition-colors"
              >
                <Plus className="w-4 h-4" />Add Coil
              </button>
            } />
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>{editingId ? 'Edit Coil' : 'Add Coil'}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-2">
                <div className="col-span-2 space-y-1.5">
                  <Label>Coil ID (from delivery slip) *</Label>
                  <Input
                    value={form.coil_identifier}
                    onChange={(e) => setF('coil_identifier')(e.target.value)}
                    placeholder="e.g. C-2024-001"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Category *</Label>
                  <Select value={form.coil_category} onValueChange={handleCategoryChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="panel">Panel</SelectItem>
                      <SelectItem value="hat_channel_brace">Hat Channel / Brace</SelectItem>
                      <SelectItem value="tube">Tube</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.coil_category === 'tube' && (
                  <div className="space-y-1.5">
                    <Label>Gauge *</Label>
                    <Select value={form.gauge} onValueChange={setF('gauge')}>
                      <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12">12 Gauge</SelectItem>
                        <SelectItem value="14">14 Gauge</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Initial Weight (lbs) *</Label>
                  <Input
                    type="number" step="0.01"
                    value={form.initial_weight_lbs}
                    onChange={(e) => setF('initial_weight_lbs')(e.target.value)}
                    placeholder="1500.00"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Lbs per Linear Foot *</Label>
                  <Input
                    type="number" step="0.000001"
                    value={form.lbs_per_linear_foot}
                    onChange={(e) => setF('lbs_per_linear_foot')(e.target.value)}
                    placeholder="2.5"
                  />
                </div>
                {form.coil_category !== 'hat_channel_brace' && (
                  <div className="space-y-1.5">
                    <Label>Color</Label>
                    <Select value={form.color} onValueChange={setF('color')}>
                      <SelectTrigger><SelectValue placeholder="Select color…" /></SelectTrigger>
                      <SelectContent>
                        {palette.map((c) => (
                          <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>ASTM Code</Label>
                  <Input
                    value={form.astm_code}
                    onChange={(e) => setF('astm_code')(e.target.value)}
                    placeholder="e.g. A1011 CS Type B"
                  />
                </div>
                {estFootage && (
                  <div className="col-span-2 bg-slate-50 rounded-lg px-3 py-2 text-sm">
                    <span className="text-muted-foreground">Est. total footage: </span>
                    <span className="font-semibold">{estFootage}</span>
                  </div>
                )}
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
                <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={addLoading}>
                  {addLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{editingId ? 'Save' : 'Add Coil'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <p className="text-xs text-muted-foreground">{displayed.length} coil{displayed.length !== 1 ? 's' : ''}</p>

      <div className="border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-muted-foreground border-b">
              <tr>
                <th className="text-left p-3">Coil ID</th>
                <th className="text-left p-3">Category</th>
                <th className="text-right p-3">Total Footage</th>
                <th className="text-right p-3">Remaining</th>
                <th className="text-right p-3">Usage</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {displayed.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground text-sm">
                    No coils found
                  </td>
                </tr>
              )}
              {displayed.map((coil) => {
                const total      = totalFeet(coil)
                const remaining  = remainingFeet(coil)
                const usedFrac   = (total - remaining) / total
                const usedPct    = Math.min(100, Math.round(usedFrac * 100))
                const noWeight   = coil.current_weight_lbs === null
                const isBusy     = statusLoading === coil.id
                const isEditing  = weightEditing === coil.id
                const preview    = weightPreview(coil)

                return (
                  <tr
                    key={coil.id}
                    className={`${coil.status === 'depleted' || coil.archived ? 'opacity-50' : ''} bg-white hover:bg-slate-50 transition-colors`}
                  >
                    {/* Coil ID */}
                    <td className="p-3">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-mono font-semibold">{coil.coil_identifier}</p>
                        {coil.color && (
                          <span className="inline-flex items-center gap-1 text-xs rounded-full px-1.5 py-0.5 bg-slate-100 text-slate-700">
                            <span
                              className="w-2.5 h-2.5 rounded-full border border-slate-300"
                              style={{ backgroundColor: coil.color.toLowerCase() in ({} as Record<string,string>) ? coil.color : '#6b7280' }}
                            />
                            {coil.color}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {coil.lbs_per_linear_foot} lbs/ft
                        {coil.gauge ? ` · ${coil.gauge} GA` : ''}
                      </p>
                      {coil.astm_code && (
                        <p className="text-xs text-muted-foreground font-mono">{coil.astm_code}</p>
                      )}
                      {coil.last_weighed_at && (
                        <p className="text-xs text-muted-foreground">
                          Weighed {new Date(coil.last_weighed_at).toLocaleDateString()}
                        </p>
                      )}
                    </td>

                    {/* Category */}
                    <td className="p-3">
                      <Badge className={`${CATEGORY_BADGE[coil.coil_category]} border text-xs`}>
                        {CATEGORY_LABELS[coil.coil_category]}
                      </Badge>
                    </td>

                    {/* Total footage */}
                    <td className="p-3 text-right font-mono">{fmtFeet(total)}</td>

                    {/* Remaining */}
                    <td className="p-3 text-right">
                      {noWeight ? (
                        <span className="text-xs text-muted-foreground italic">Not weighed</span>
                      ) : (
                        <div>
                          <p className={`font-mono font-semibold ${
                            usedFrac > 0.8 ? 'text-red-600' :
                            usedFrac > 0.5 ? 'text-amber-600' : 'text-green-700'
                          }`}>
                            {fmtFeet(remaining)}
                          </p>
                          {preview && (
                            <p className="text-xs text-blue-600">→ {preview}</p>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Usage bar */}
                    <td className="p-3 text-right">
                      {noWeight ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <div className="flex flex-col items-end gap-1">
                          <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                usedPct > 80 ? 'bg-red-500' : usedPct > 50 ? 'bg-amber-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${usedPct}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">{usedPct}% used</p>
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="p-3">
                      {coil.status === 'active'   && <Badge className="bg-green-100 text-green-700 border-green-200 border text-xs">Active</Badge>}
                      {coil.status === 'depleted' && <Badge className="bg-slate-100 text-slate-500 border-slate-200 border text-xs">Depleted</Badge>}
                      {coil.status === 'on_hold'  && <Badge className="bg-amber-100 text-amber-700 border-amber-200 border text-xs">On Hold</Badge>}
                    </td>

                    {/* Actions */}
                    <td className="p-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isEditing ? (
                          <>
                            <Input
                              type="number" step="0.01"
                              className="h-7 w-24 text-xs"
                              placeholder="lbs"
                              value={weightInput}
                              onChange={(e) => setWeightInput(e.target.value)}
                              autoFocus
                              onKeyDown={(e) => e.key === 'Enter' && handleUpdateWeight(coil.id, coil.current_weight_lbs)}
                            />
                            <Button
                              size="sm" className="h-7 text-xs"
                              onClick={() => handleUpdateWeight(coil.id, coil.current_weight_lbs)}
                              disabled={weightLoading}
                            >
                              {weightLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                            </Button>
                            <button
                              className="text-xs text-muted-foreground hover:text-foreground"
                              onClick={() => { setWeightEditing(null); setWeightInput('') }}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm" variant="outline" className="h-7 text-xs"
                              onClick={() => {
                                setWeightEditing(coil.id)
                                setWeightInput(coil.current_weight_lbs?.toString() ?? '')
                              }}
                            >
                              <Scale className="w-3 h-3 mr-1" />Weigh
                            </Button>
                            {isAdmin && coil.status !== 'depleted' && (
                              <Button
                                size="sm" variant="outline"
                                className="h-7 text-xs text-slate-600"
                                onClick={() => handleStatus(coil.id, 'depleted')}
                                disabled={isBusy}
                              >
                                {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Mark Depleted'}
                              </Button>
                            )}
                            {isAdmin && coil.status === 'depleted' && (
                              <Button
                                size="sm" variant="outline"
                                className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50"
                                onClick={() => handleStatus(coil.id, 'active')}
                                disabled={isBusy}
                              >
                                {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Reactivate'}
                              </Button>
                            )}
                            {canManage && (
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEdit(coil)}>
                                <Pencil className="w-3 h-3 mr-1" />Edit
                              </Button>
                            )}
                            {isAdmin && (
                              <LinkPoDialog
                                table="product_coils"
                                rowId={coil.id}
                                vendors={vendors}
                                openPos={openPos}
                                currentVendorId={coil.vendor_id}
                                currentPoId={coil.po_id}
                                onLinked={fetchCoils}
                              />
                            )}
                            {canManage && (
                              coil.archived ? (
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setArchived(coil.id, false)} disabled={rowBusy === coil.id}>
                                  <ArchiveRestore className="w-3 h-3 mr-1" />Restore
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setArchived(coil.id, true)} disabled={rowBusy === coil.id}>
                                  <Archive className="w-3 h-3 mr-1" />Archive
                                </Button>
                              )
                            )}
                            {isAdmin && (
                              <Button
                                size="sm" variant="outline"
                                className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => hardDelete(coil)}
                                disabled={rowBusy === coil.id}
                              >
                                <Trash2 className="w-3 h-3 mr-1" />Delete
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
