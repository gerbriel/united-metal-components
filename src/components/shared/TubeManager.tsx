'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Loader2, Settings, Package } from 'lucide-react'

interface TubeProduct {
  id: number
  name: string
}

export interface TubeSpec {
  id: number
  product_id: number
  gauge: '12' | '14'
  available_lengths_ft: number[]
  default_pieces_per_bundle: number | null
  price_per_linear_foot: number
  products?: { name: string } | null
}

export interface TubeBundle {
  id: number
  product_id: number
  coil_id: number | null
  gauge: '12' | '14'
  length_feet: number
  bundle_identifier: string | null
  pieces_per_bundle: number
  total_bundles: number
  available_bundles: number
  available_pieces: number
  price_per_bundle: number | null
  status: 'active' | 'depleted'
  notes: string | null
  received_at: string
  products?: { name: string } | null
  product_coils?: { coil_identifier: string } | null
}

interface Props {
  initialSpecs:   TubeSpec[]
  initialBundles: TubeBundle[]
  tubeProducts:   TubeProduct[]
  isAdmin:        boolean
}

const STANDARD_LENGTHS = [20, 22, 24, 26, 32]

const EMPTY_SPEC_FORM = {
  product_id:                '',
  gauge:                     '' as '12' | '14' | '',
  available_lengths_ft:      STANDARD_LENGTHS as number[],
  default_pieces_per_bundle: '',
  price_per_linear_foot:     '',
}

const EMPTY_BUNDLE_FORM = {
  product_id:       '',
  coil_id:          '',
  gauge:            '' as '12' | '14' | '',
  length_feet:      '',
  bundle_identifier:'',
  pieces_per_bundle:'',
  total_bundles:    '',
  price_per_bundle: '',
  notes:            '',
}

export default function TubeManager({ initialSpecs, initialBundles, tubeProducts, isAdmin }: Props) {
  const [specs,   setSpecs]   = useState<TubeSpec[]>(initialSpecs)
  const [bundles, setBundles] = useState<TubeBundle[]>(initialBundles)
  const [coilOptions, setCoilOptions] = useState<{ id: number; coil_identifier: string; gauge: string }[]>([])

  const [specOpen,   setSpecOpen]   = useState(false)
  const [bundleOpen, setBundleOpen] = useState(false)
  const [specLoading,   setSpecLoading]   = useState(false)
  const [bundleLoading, setBundleLoading] = useState(false)

  const [specForm,   setSpecForm]   = useState(EMPTY_SPEC_FORM)
  const [bundleForm, setBundleForm] = useState(EMPTY_BUNDLE_FORM)

  const [countEditing, setCountEditing] = useState<number | null>(null)
  const [countForm, setCountForm] = useState({ available_bundles: '', available_pieces: '' })
  const [countLoading, setCountLoading] = useState(false)

  const [gaugeFilter, setGaugeFilter] = useState('all')

  const supabase = createClient()

  const fetchAll = useCallback(async () => {
    const [{ data: sp }, { data: bn }] = await Promise.all([
      supabase
        .from('tube_specs')
        .select('*, products(name)')
        .order('product_id'),
      supabase
        .from('tube_bundles')
        .select('*, products(name), product_coils(coil_identifier)')
        .order('received_at', { ascending: false }),
    ])
    if (sp) setSpecs(sp as TubeSpec[])
    if (bn) setBundles(bn as TubeBundle[])
  }, [])

  useEffect(() => {
    const ch = supabase
      .channel('tubes-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tube_bundles' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tube_specs'   }, fetchAll)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchAll])

  // Load tube coils for coil-id picker in bundle form
  useEffect(() => {
    supabase
      .from('product_coils')
      .select('id, coil_identifier, gauge')
      .eq('coil_category', 'tube')
      .eq('status', 'active')
      .then(({ data }) => { if (data) setCoilOptions(data as any) })
  }, [])

  const setS = (k: keyof typeof EMPTY_SPEC_FORM) => (v: string | null) =>
    setSpecForm((f) => ({ ...f, [k]: v ?? '' }))

  const setB = (k: keyof typeof EMPTY_BUNDLE_FORM) => (v: string | null) =>
    setBundleForm((f) => ({ ...f, [k]: v ?? '' }))

  const toggleLength = (len: number) =>
    setSpecForm((f) => ({
      ...f,
      available_lengths_ft: f.available_lengths_ft.includes(len)
        ? f.available_lengths_ft.filter((l) => l !== len)
        : [...f.available_lengths_ft, len].sort((a, b) => a - b),
    }))

  const handleAddSpec = async () => {
    if (!specForm.product_id || !specForm.gauge || !specForm.price_per_linear_foot) {
      toast.error('Product, gauge, and price/ft are required')
      return
    }
    if (specForm.available_lengths_ft.length === 0) {
      toast.error('Select at least one length')
      return
    }
    setSpecLoading(true)
    const { error } = await supabase.from('tube_specs').insert({
      product_id:                parseInt(specForm.product_id),
      gauge:                     specForm.gauge,
      available_lengths_ft:      specForm.available_lengths_ft,
      default_pieces_per_bundle: specForm.default_pieces_per_bundle ? parseInt(specForm.default_pieces_per_bundle) : null,
      price_per_linear_foot:     parseFloat(specForm.price_per_linear_foot),
    })
    if (error) { toast.error(error.message); setSpecLoading(false); return }
    toast.success('Tube spec added')
    setSpecOpen(false)
    setSpecForm(EMPTY_SPEC_FORM)
    await fetchAll()
    setSpecLoading(false)
  }

  const handleAddBundle = async () => {
    if (!bundleForm.product_id || !bundleForm.gauge || !bundleForm.length_feet || !bundleForm.pieces_per_bundle || !bundleForm.total_bundles) {
      toast.error('Product, gauge, length, pieces/bundle, and total bundles are required')
      return
    }
    setBundleLoading(true)
    const total = parseInt(bundleForm.total_bundles)
    const { error } = await supabase.from('tube_bundles').insert({
      product_id:        parseInt(bundleForm.product_id),
      coil_id:           bundleForm.coil_id ? parseInt(bundleForm.coil_id) : null,
      gauge:             bundleForm.gauge,
      length_feet:       parseInt(bundleForm.length_feet),
      bundle_identifier: bundleForm.bundle_identifier || null,
      pieces_per_bundle: parseInt(bundleForm.pieces_per_bundle),
      total_bundles:     total,
      available_bundles: total,
      available_pieces:  0,
      price_per_bundle:  bundleForm.price_per_bundle ? parseFloat(bundleForm.price_per_bundle) : null,
      notes:             bundleForm.notes || null,
    })
    if (error) { toast.error(error.message); setBundleLoading(false); return }
    toast.success('Bundle batch added')
    setBundleOpen(false)
    setBundleForm(EMPTY_BUNDLE_FORM)
    await fetchAll()
    setBundleLoading(false)
  }

  const handleUpdateCount = async (bundleId: number) => {
    const avail   = parseInt(countForm.available_bundles)
    const pieces  = parseInt(countForm.available_pieces) || 0
    if (isNaN(avail) || avail < 0) { toast.error('Enter a valid bundle count'); return }
    setCountLoading(true)
    const { error } = await supabase
      .from('tube_bundles')
      .update({
        available_bundles: avail,
        available_pieces:  pieces,
        status: avail === 0 && pieces === 0 ? 'depleted' : 'active',
      })
      .eq('id', bundleId)
    if (error) { toast.error(error.message); setCountLoading(false); return }
    toast.success('Counts updated')
    setCountEditing(null)
    await fetchAll()
    setCountLoading(false)
  }

  const displayedBundles = gaugeFilter === 'all'
    ? bundles
    : bundles.filter((b) => b.gauge === gaugeFilter)

  // Available lengths from spec for the selected bundle product/gauge combo
  const specForBundle = () => {
    if (!bundleForm.product_id || !bundleForm.gauge) return STANDARD_LENGTHS
    const s = specs.find((sp) => sp.product_id === parseInt(bundleForm.product_id) && sp.gauge === bundleForm.gauge)
    return s?.available_lengths_ft ?? STANDARD_LENGTHS
  }

  return (
    <div className="space-y-8">

      {/* ── Tube Specs ─────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Tube Specs</h2>
            <p className="text-xs text-muted-foreground">Pricing and available lengths per product/gauge</p>
          </div>
          {isAdmin && (
            <Dialog open={specOpen} onOpenChange={setSpecOpen}>
              <DialogTrigger render={
                <button className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
                  <Settings className="w-3.5 h-3.5" />Add Spec
                </button>
              } />
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Add Tube Spec</DialogTitle></DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Product *</Label>
                      <Select value={specForm.product_id} onValueChange={setS('product_id')}>
                        <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                        <SelectContent>
                          {tubeProducts.map((p) => (
                            <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Gauge *</Label>
                      <Select value={specForm.gauge} onValueChange={setS('gauge')}>
                        <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="12">12 Gauge</SelectItem>
                          <SelectItem value="14">14 Gauge</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Price per Linear Foot *</Label>
                      <Input
                        type="number" step="0.0001"
                        value={specForm.price_per_linear_foot}
                        onChange={(e) => setS('price_per_linear_foot')(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Default Pieces/Bundle</Label>
                      <Input
                        type="number"
                        value={specForm.default_pieces_per_bundle}
                        onChange={(e) => setS('default_pieces_per_bundle')(e.target.value)}
                        placeholder="e.g. 10"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Available Lengths (ft)</Label>
                    <div className="flex gap-2 flex-wrap">
                      {STANDARD_LENGTHS.map((l) => (
                        <button
                          key={l}
                          type="button"
                          onClick={() => toggleLength(l)}
                          className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                            specForm.available_lengths_ft.includes(l)
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'border-border hover:bg-muted'
                          }`}
                        >
                          {l} ft
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setSpecOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddSpec} disabled={specLoading}>
                    {specLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Add Spec
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {specs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No tube specs configured yet.</p>
        ) : (
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-muted-foreground border-b">
                <tr>
                  <th className="text-left p-3">Product</th>
                  <th className="text-left p-3">Gauge</th>
                  <th className="text-left p-3">Available Lengths</th>
                  <th className="text-right p-3">$/Linear Ft</th>
                  <th className="text-right p-3">Default Pcs/Bundle</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {specs.map((s) => (
                  <tr key={s.id} className="bg-white hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-medium">{s.products?.name ?? `Product #${s.product_id}`}</td>
                    <td className="p-3">
                      <Badge className="bg-slate-100 text-slate-700 border-slate-200 border text-xs">
                        {s.gauge} GA
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1 flex-wrap">
                        {s.available_lengths_ft.map((l) => (
                          <span key={l} className="text-xs bg-blue-50 text-blue-700 rounded px-1.5 py-0.5">{l} ft</span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-right font-mono font-semibold">
                      ${parseFloat(s.price_per_linear_foot as any).toFixed(4)}
                    </td>
                    <td className="p-3 text-right text-muted-foreground">
                      {s.default_pieces_per_bundle ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Bundle Inventory ────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-base font-semibold">Bundle Inventory</h2>
            <p className="text-xs text-muted-foreground">Available bundles and loose pieces per batch</p>
          </div>
          <div className="flex items-center gap-2">
            {['all', '12', '14'].map((g) => (
              <button
                key={g}
                onClick={() => setGaugeFilter(g)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  gaugeFilter === g
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border hover:bg-muted text-muted-foreground'
                }`}
              >
                {g === 'all' ? 'All Gauges' : `${g} GA`}
              </button>
            ))}
            {isAdmin && (
              <Dialog open={bundleOpen} onOpenChange={setBundleOpen}>
                <DialogTrigger render={
                  <button className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/80 transition-colors">
                    <Plus className="w-4 h-4" />Add Bundle Batch
                  </button>
                } />
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>Add Bundle Batch</DialogTitle></DialogHeader>
                  <div className="grid grid-cols-2 gap-4 py-2">
                    <div className="space-y-1.5">
                      <Label>Product *</Label>
                      <Select value={bundleForm.product_id} onValueChange={setB('product_id')}>
                        <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                        <SelectContent>
                          {tubeProducts.map((p) => (
                            <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Gauge *</Label>
                      <Select value={bundleForm.gauge} onValueChange={setB('gauge')}>
                        <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="12">12 Gauge</SelectItem>
                          <SelectItem value="14">14 Gauge</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Length (ft) *</Label>
                      <Select value={bundleForm.length_feet} onValueChange={setB('length_feet')}>
                        <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                        <SelectContent>
                          {specForBundle().map((l) => (
                            <SelectItem key={l} value={l.toString()}>{l} ft</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Source Coil (optional)</Label>
                      <Select value={bundleForm.coil_id} onValueChange={setB('coil_id')}>
                        <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">— None —</SelectItem>
                          {coilOptions
                            .filter((c) => !bundleForm.gauge || c.gauge === bundleForm.gauge)
                            .map((c) => (
                              <SelectItem key={c.id} value={c.id.toString()}>
                                {c.coil_identifier} ({c.gauge} GA)
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Bundle ID (delivery slip)</Label>
                      <Input
                        value={bundleForm.bundle_identifier}
                        onChange={(e) => setB('bundle_identifier')(e.target.value)}
                        placeholder="e.g. B-2024-001"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Pieces per Bundle *</Label>
                      <Input
                        type="number"
                        value={bundleForm.pieces_per_bundle}
                        onChange={(e) => setB('pieces_per_bundle')(e.target.value)}
                        placeholder="e.g. 10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Total Bundles *</Label>
                      <Input
                        type="number"
                        value={bundleForm.total_bundles}
                        onChange={(e) => setB('total_bundles')(e.target.value)}
                        placeholder="e.g. 5"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Price per Bundle (optional)</Label>
                      <Input
                        type="number" step="0.01"
                        value={bundleForm.price_per_bundle}
                        onChange={(e) => setB('price_per_bundle')(e.target.value)}
                        placeholder="Overrides $/ft pricing"
                      />
                    </div>
                    {bundleForm.total_bundles && bundleForm.pieces_per_bundle && bundleForm.length_feet && (
                      <div className="col-span-2 bg-slate-50 rounded-lg px-3 py-2 text-xs space-y-0.5">
                        <p>
                          <span className="text-muted-foreground">Total pieces: </span>
                          <span className="font-semibold">
                            {parseInt(bundleForm.total_bundles) * parseInt(bundleForm.pieces_per_bundle)}
                          </span>
                        </p>
                        <p>
                          <span className="text-muted-foreground">Total linear feet: </span>
                          <span className="font-semibold">
                            {(parseInt(bundleForm.total_bundles) * parseInt(bundleForm.pieces_per_bundle) * parseInt(bundleForm.length_feet)).toLocaleString()} ft
                          </span>
                        </p>
                      </div>
                    )}
                    <div className="col-span-2 space-y-1.5">
                      <Label>Notes</Label>
                      <Input
                        value={bundleForm.notes}
                        onChange={(e) => setB('notes')(e.target.value)}
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setBundleOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddBundle} disabled={bundleLoading}>
                      {bundleLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Add Batch
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {displayedBundles.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No bundle batches found.</p>
        ) : (
          <div className="border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-muted-foreground border-b">
                  <tr>
                    <th className="text-left p-3">Product / Spec</th>
                    <th className="text-left p-3">Source Coil</th>
                    <th className="text-right p-3">Total</th>
                    <th className="text-right p-3">Available</th>
                    <th className="text-right p-3">Loose Pieces</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {displayedBundles.map((b) => {
                    const isEditing = countEditing === b.id
                    const totalPcs  = b.total_bundles * b.pieces_per_bundle
                    const availPcs  = b.available_bundles * b.pieces_per_bundle + b.available_pieces
                    const usedPct   = totalPcs > 0
                      ? Math.round(((totalPcs - availPcs) / totalPcs) * 100)
                      : 0

                    return (
                      <tr
                        key={b.id}
                        className={`${b.status === 'depleted' ? 'opacity-50' : ''} bg-white hover:bg-slate-50 transition-colors`}
                      >
                        <td className="p-3">
                          <p className="font-medium">{b.products?.name ?? `Product #${b.product_id}`}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge className="bg-slate-100 text-slate-700 border-slate-200 border text-xs">
                              {b.gauge} GA
                            </Badge>
                            <span className="text-xs text-muted-foreground">{b.length_feet} ft pieces</span>
                            <span className="text-xs text-muted-foreground">· {b.pieces_per_bundle} pcs/bundle</span>
                          </div>
                          {b.bundle_identifier && (
                            <p className="text-xs font-mono text-muted-foreground mt-0.5">{b.bundle_identifier}</p>
                          )}
                        </td>
                        <td className="p-3 text-sm">
                          {b.product_coils?.coil_identifier ? (
                            <span className="font-mono text-xs text-muted-foreground">{b.product_coils.coil_identifier}</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <p className="font-mono">{b.total_bundles} bundles</p>
                          <p className="text-xs text-muted-foreground">{totalPcs} pcs total</p>
                        </td>
                        <td className="p-3 text-right">
                          {isEditing ? (
                            <Input
                              type="number"
                              className="h-7 w-20 text-xs text-right"
                              value={countForm.available_bundles}
                              onChange={(e) => setCountForm((f) => ({ ...f, available_bundles: e.target.value }))}
                              placeholder="bundles"
                            />
                          ) : (
                            <div>
                              <p className={`font-mono font-semibold ${
                                availPcs === 0 ? 'text-red-600' :
                                usedPct > 70 ? 'text-amber-600' : 'text-green-700'
                              }`}>
                                {b.available_bundles} bundles
                              </p>
                              <p className="text-xs text-muted-foreground">{availPcs} pcs avail</p>
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {isEditing ? (
                            <Input
                              type="number"
                              className="h-7 w-20 text-xs text-right"
                              value={countForm.available_pieces}
                              onChange={(e) => setCountForm((f) => ({ ...f, available_pieces: e.target.value }))}
                              placeholder="pcs"
                            />
                          ) : (
                            <span className="font-mono">{b.available_pieces}</span>
                          )}
                        </td>
                        <td className="p-3">
                          {b.status === 'active' ? (
                            <div className="space-y-1">
                              <Badge className="bg-green-100 text-green-700 border-green-200 border text-xs">Active</Badge>
                              <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${usedPct > 70 ? 'bg-amber-500' : 'bg-green-500'}`}
                                  style={{ width: `${usedPct}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-500 border-slate-200 border text-xs">Depleted</Badge>
                          )}
                        </td>
                        <td className="p-3">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <Button
                                size="sm" className="h-7 text-xs"
                                onClick={() => handleUpdateCount(b.id)}
                                disabled={countLoading}
                              >
                                {countLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                              </Button>
                              <button
                                className="text-xs text-muted-foreground hover:text-foreground"
                                onClick={() => setCountEditing(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <Button
                              size="sm" variant="outline" className="h-7 text-xs"
                              onClick={() => {
                                setCountEditing(b.id)
                                setCountForm({
                                  available_bundles: b.available_bundles.toString(),
                                  available_pieces:  b.available_pieces.toString(),
                                })
                              }}
                            >
                              <Package className="w-3 h-3 mr-1" />Update
                            </Button>
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
    </div>
  )
}
