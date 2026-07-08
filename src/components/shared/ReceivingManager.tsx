'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { COLORS } from '@/lib/product-config'

interface TubeProduct { id: number; name: string }

interface AstmCode {
  id: number
  code: string
  description: string | null
  category: 'panel' | 'hat_channel_brace' | 'tube' | null
  is_favorite: boolean
  sort_order: number
}

interface Vendor { id: string; name: string }
interface OpenPo {
  id: string
  po_number: string | null
  vendor_id: string | null
  status: string
  order_date: string
  purchase_order_items?: { color: string | null }[]
}

// First finish color ordered on a PO — used to prefill the coil color when
// receiving against that PO.
function poColor(po: OpenPo | undefined): string {
  return po?.purchase_order_items?.map((i) => i.color).find(Boolean) ?? ''
}

interface Props {
  tubeProducts: TubeProduct[]
  astmCodes: AstmCode[]
  vendors: Vendor[]
  openPos: OpenPo[]
}

const STANDARD_LENGTHS = [20, 22, 24, 26, 32]

// Tube coils are not received here — that flow is "Receive Tube Bundles".
// The coil form serves panels and hat channel / brace; the category comes from
// the active tab, so it isn't a field on the form.
const EMPTY_COIL = {
  coil_identifier:     '',
  color:               '',
  astm_code:           '',
  initial_weight_lbs:  '',
  lbs_per_linear_foot: '',
  notes:               '',
}

type CoilTab = 'panel' | 'hat_brace'
type ReceiveTab = CoilTab | 'bundle'
const coilCategoryFor = (tab: CoilTab) => (tab === 'hat_brace' ? 'hat_channel_brace' : 'panel')

const EMPTY_BUNDLE = {
  product_id:        '',
  gauge:             '' as '12' | '14' | '',
  length_feet:       '',
  coil_identifier:   '',
  bundle_identifier: '',
  pieces_per_bundle: '',
  total_bundles:     '',
  price_per_bundle:  '',
  notes:             '',
}

function fmtFeet(feet: number): string {
  const f = Math.floor(feet)
  const inches = Math.round((feet - f) * 12)
  if (inches === 0)  return `${f.toLocaleString()} ft`
  if (inches === 12) return `${(f + 1).toLocaleString()} ft`
  return `${f.toLocaleString()} ft ${inches} in`
}

// Favorited ASTM codes that apply to a coil category (its own category or the
// category-agnostic ones), ordered so the top favorite is the default.
function astmForCategory(codes: AstmCode[], cat: string): AstmCode[] {
  return codes
    .filter((c) => c.category === cat || c.category === null)
    .sort((a, b) => (b.is_favorite ? 1 : 0) - (a.is_favorite ? 1 : 0) || a.sort_order - b.sort_order)
}

function defaultAstmFor(codes: AstmCode[], cat: string): string {
  return astmForCategory(codes, cat).find((c) => c.is_favorite)?.code ?? ''
}

export default function ReceivingManager({ tubeProducts, astmCodes, vendors, openPos }: Props) {
  const [tab, setTab]           = useState<ReceiveTab>('panel')
  const [coilForm, setCoilForm] = useState({ ...EMPTY_COIL, astm_code: defaultAstmFor(astmCodes, 'panel') })
  const [bundleForm, setBundleForm] = useState(EMPTY_BUNDLE)
  const [coilLoading, setCoilLoading]   = useState(false)
  const [bundleLoading, setBundleLoading] = useState(false)
  const [lastCoil, setLastCoil]   = useState<string | null>(null)
  const [lastBundle, setLastBundle] = useState<string | null>(null)

  // Shipment source — a vendor + optional PO applied to whatever is received.
  const [pos, setPos]           = useState<OpenPo[]>(openPos)
  const [vendorId, setVendorId] = useState('')
  const [poId, setPoId]         = useState('')
  const [creatingPo, setCreatingPo] = useState(false)

  const supabase = createClient()

  // POs selectable for the chosen vendor (or all open POs if no vendor picked).
  const vendorPos = pos.filter((p) => !vendorId || p.vendor_id === vendorId)

  const handleVendorChange = (v: string | null) => {
    const id = v === '__none__' ? '' : (v ?? '')
    setVendorId(id)
    // Drop a PO selection that doesn't belong to the newly chosen vendor.
    if (poId && id) {
      const po = pos.find((p) => p.id === poId)
      if (po && po.vendor_id !== id) setPoId('')
    }
  }

  // Selecting a PO prefills the coil color from what was ordered (panel tab only —
  // hat channel / brace carries no finish color).
  const selectPo = (id: string) => {
    setPoId(id)
    if (!id) return
    const c = poColor(pos.find((p) => p.id === id))
    if (c && tab === 'panel') setCoilForm((f) => ({ ...f, color: c }))
  }

  const handleCreatePo = async () => {
    setCreatingPo(true)
    const { data, error } = await supabase
      .from('purchase_orders')
      .insert({ vendor_id: vendorId || null, status: 'draft' })
      .select('id, po_number, vendor_id, status, order_date')
      .single()
    if (error || !data) { toast.error(error?.message ?? 'Failed to create PO'); setCreatingPo(false); return }
    setPos((prev) => [data as OpenPo, ...prev])
    setPoId((data as OpenPo).id)
    toast.success('Draft PO created — link items to it as you receive')
    setCreatingPo(false)
  }

  const setC = (k: keyof typeof EMPTY_COIL) => (v: string | null) =>
    setCoilForm((f) => ({ ...f, [k]: v ?? '' }))

  // Switching between the panel and hat/brace coil tabs re-pulls the favorite
  // ASTM for that category and clears color where it doesn't apply.
  const handleTabChange = (t: ReceiveTab) => {
    setTab(t)
    if (t === 'panel' || t === 'hat_brace') {
      const cat = coilCategoryFor(t)
      setCoilForm((f) => ({
        ...f,
        color: cat === 'hat_channel_brace' ? '' : f.color,
        astm_code: defaultAstmFor(astmCodes, cat),
      }))
    }
  }

  const setB = (k: keyof typeof EMPTY_BUNDLE) => (v: string | null) =>
    setBundleForm((f) => ({ ...f, [k]: v ?? '' }))

  const handleReceiveCoil = async () => {
    if (!coilForm.initial_weight_lbs || !coilForm.lbs_per_linear_foot) {
      toast.error('Initial weight and lbs/ft are required')
      return
    }
    const category = coilCategoryFor(tab as CoilTab)
    setCoilLoading(true)
    const { error } = await supabase.from('product_coils').insert({
      coil_identifier:     coilForm.coil_identifier || null,
      coil_category:       category,
      gauge:               null,
      color:               category === 'hat_channel_brace' ? null : coilForm.color || null,
      astm_code:           coilForm.astm_code || null,
      initial_weight_lbs:  parseFloat(coilForm.initial_weight_lbs),
      lbs_per_linear_foot: parseFloat(coilForm.lbs_per_linear_foot),
      notes:               coilForm.notes || null,
      vendor_id:           vendorId || null,
      po_id:               poId || null,
    })
    if (error) { toast.error(error.message); setCoilLoading(false); return }
    const label = coilForm.coil_identifier
      ? `Coil ${coilForm.coil_identifier}`
      : `${category === 'hat_channel_brace' ? 'hat channel / brace' : 'panel'} coil`
    setLastCoil(`${label} — ${fmtFeet(parseFloat(coilForm.initial_weight_lbs) / parseFloat(coilForm.lbs_per_linear_foot))} est.`)
    toast.success('Coil received')
    setCoilForm({ ...EMPTY_COIL, astm_code: defaultAstmFor(astmCodes, category) })
    setCoilLoading(false)
  }

  const handleReceiveBundle = async () => {
    if (!bundleForm.product_id || !bundleForm.gauge || !bundleForm.length_feet || !bundleForm.pieces_per_bundle || !bundleForm.total_bundles) {
      toast.error('Product, gauge, length, pieces/bundle, and total bundles are required')
      return
    }
    setBundleLoading(true)

    // Optionally find or skip coil linkage
    let coilId: number | null = null
    if (bundleForm.coil_identifier) {
      const { data: coilRow } = await supabase
        .from('product_coils')
        .select('id')
        .eq('coil_identifier', bundleForm.coil_identifier)
        .eq('coil_category', 'tube')
        .single()
      coilId = (coilRow as any)?.id ?? null
      if (!coilId) toast.error(`Coil "${bundleForm.coil_identifier}" not found — bundle will be saved without coil link`)
    }

    const total = parseInt(bundleForm.total_bundles)
    const { error } = await supabase.from('tube_bundles').insert({
      product_id:        parseInt(bundleForm.product_id),
      coil_id:           coilId,
      gauge:             bundleForm.gauge,
      length_feet:       parseInt(bundleForm.length_feet),
      bundle_identifier: bundleForm.bundle_identifier || null,
      pieces_per_bundle: parseInt(bundleForm.pieces_per_bundle),
      total_bundles:     total,
      available_bundles: total,
      available_pieces:  0,
      price_per_bundle:  bundleForm.price_per_bundle ? parseFloat(bundleForm.price_per_bundle) : null,
      notes:             bundleForm.notes || null,
      vendor_id:         vendorId || null,
      po_id:             poId || null,
    })
    if (error) { toast.error(error.message); setBundleLoading(false); return }
    const pcs = total * parseInt(bundleForm.pieces_per_bundle)
    setLastBundle(
      `${total} bundles · ${pcs} pieces · ${bundleForm.length_feet} ft · ${bundleForm.gauge} GA`
    )
    toast.success('Bundle batch received')
    setBundleForm(EMPTY_BUNDLE)
    setBundleLoading(false)
  }

  const estFootage = coilForm.initial_weight_lbs && coilForm.lbs_per_linear_foot
    ? fmtFeet(parseFloat(coilForm.initial_weight_lbs) / parseFloat(coilForm.lbs_per_linear_foot))
    : null

  const bundleTotals = bundleForm.total_bundles && bundleForm.pieces_per_bundle && bundleForm.length_feet
    ? {
        pieces:    parseInt(bundleForm.total_bundles) * parseInt(bundleForm.pieces_per_bundle),
        linearFt:  parseInt(bundleForm.total_bundles) * parseInt(bundleForm.pieces_per_bundle) * parseInt(bundleForm.length_feet),
      }
    : null

  return (
    <div className="max-w-2xl space-y-6">
      {/* Tab switcher — one flow per material type */}
      <div className="flex rounded-lg border overflow-hidden w-fit flex-wrap">
        {([
          ['panel',     'Receive Panel Coil'],
          ['bundle',    'Receive Tube Bundles'],
          ['hat_brace', 'Receive Hat Channel / Brace Coil'],
        ] as const).map(([t, label]) => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
            className={`px-5 py-2 text-sm font-medium transition-colors ${
              tab === t ? 'bg-primary text-primary-foreground' : 'bg-white hover:bg-muted text-muted-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Shipment source: vendor + PO ───────────────────────── */}
      <div className="rounded-lg border bg-slate-50/60 p-4 space-y-3">
        <p className="text-sm font-semibold">Shipment Source <span className="text-muted-foreground font-normal">(optional)</span></p>
        <p className="text-xs text-muted-foreground">
          Attach received items to a vendor and purchase order. Pick an open PO, or create a new draft PO to receive against.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Vendor</Label>
            <Select value={vendorId || '__none__'} onValueChange={handleVendorChange}>
              <SelectTrigger><SelectValue placeholder="Select vendor…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {vendors.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Purchase Order</Label>
            <div className="flex gap-2">
              <Select value={poId || '__none__'} onValueChange={(v) => selectPo(v === '__none__' ? '' : (v ?? ''))}>
                <SelectTrigger><SelectValue placeholder="Select PO…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {vendorPos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.po_number ?? `PO ${p.id.slice(0, 8)}`} · {p.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" onClick={handleCreatePo} disabled={creatingPo} className="shrink-0">
                {creatingPo ? <Loader2 className="w-4 h-4 animate-spin" /> : 'New PO'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Coil form (panels + hat channel / brace) ───────────── */}
      {tab !== 'bundle' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {tab === 'panel'
              ? 'Log a new panel coil from a shipment.'
              : 'Log a new hat channel / brace coil from a shipment.'}
            {' '}Coil ID and ASTM code are optional — add them if available on the delivery slip.
          </p>

          {lastCoil && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Last received: {lastCoil}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Initial Weight (lbs) *</Label>
              <Input
                type="number" step="0.01"
                value={coilForm.initial_weight_lbs}
                onChange={(e) => setC('initial_weight_lbs')(e.target.value)}
                placeholder="e.g. 1500.00"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Lbs per Linear Foot *</Label>
              <Input
                type="number" step="0.000001"
                value={coilForm.lbs_per_linear_foot}
                onChange={(e) => setC('lbs_per_linear_foot')(e.target.value)}
                placeholder="e.g. 2.5"
              />
            </div>

            {estFootage && (
              <div className="col-span-2 bg-slate-50 rounded-lg px-3 py-2 text-sm">
                <span className="text-muted-foreground">Est. total footage: </span>
                <span className="font-semibold">{estFootage}</span>
              </div>
            )}

            {/* Color applies to panels only — hat channel / brace are
                structural and carry no finish color. */}
            {tab === 'panel' && (
              <div className="space-y-1.5">
                <Label>Color</Label>
                <Select value={coilForm.color} onValueChange={setC('color')}>
                  <SelectTrigger><SelectValue placeholder="Select color…" /></SelectTrigger>
                  <SelectContent>
                    {COLORS.map((c) => (
                      <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Coil ID <span className="text-muted-foreground font-normal">(delivery slip)</span></Label>
              <Input
                value={coilForm.coil_identifier}
                onChange={(e) => setC('coil_identifier')(e.target.value)}
                placeholder="e.g. C-2024-001"
              />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label>ASTM Code <span className="text-muted-foreground font-normal">(optional)</span></Label>
              {astmForCategory(astmCodes, coilCategoryFor(tab as CoilTab)).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {astmForCategory(astmCodes, coilCategoryFor(tab as CoilTab)).map((c) => {
                    const active = coilForm.astm_code === c.code
                    return (
                      <button
                        key={c.id}
                        type="button"
                        title={c.description ?? undefined}
                        onClick={() => setC('astm_code')(active ? '' : c.code)}
                        className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors ${
                          active
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border hover:bg-muted text-muted-foreground'
                        }`}
                      >
                        {c.is_favorite && <span className="text-amber-400">★</span>}
                        {c.code}
                      </button>
                    )
                  })}
                </div>
              )}
              <Input
                value={coilForm.astm_code}
                onChange={(e) => setC('astm_code')(e.target.value)}
                placeholder="e.g. A1011 CS Type B — or pick a favorite above"
              />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label>Notes</Label>
              <Input
                value={coilForm.notes}
                onChange={(e) => setC('notes')(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          <Button onClick={handleReceiveCoil} disabled={coilLoading} className="w-full">
            {coilLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Log Coil Received
          </Button>
        </div>
      )}

      {/* ── Bundle form ─────────────────────────────────────────── */}
      {tab === 'bundle' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Log an incoming batch of tube bundles. Optionally link to a source coil by entering its ID.
          </p>

          {lastBundle && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Last received: {lastBundle}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
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
                  {STANDARD_LENGTHS.map((l) => (
                    <SelectItem key={l} value={l.toString()}>{l} ft</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Label>Source Coil ID <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                value={bundleForm.coil_identifier}
                onChange={(e) => setB('coil_identifier')(e.target.value)}
                placeholder="e.g. C-2024-001"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Bundle ID <span className="text-muted-foreground font-normal">(delivery slip)</span></Label>
              <Input
                value={bundleForm.bundle_identifier}
                onChange={(e) => setB('bundle_identifier')(e.target.value)}
                placeholder="e.g. B-2024-001"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Price per Bundle <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                type="number" step="0.01"
                value={bundleForm.price_per_bundle}
                onChange={(e) => setB('price_per_bundle')(e.target.value)}
                placeholder="Overrides $/ft pricing"
              />
            </div>

            {bundleTotals && (
              <div className="col-span-2 bg-slate-50 rounded-lg px-3 py-2 text-sm space-y-0.5">
                <p>
                  <span className="text-muted-foreground">Total pieces: </span>
                  <span className="font-semibold">{bundleTotals.pieces}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Total linear feet: </span>
                  <span className="font-semibold">{bundleTotals.linearFt.toLocaleString()} ft</span>
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

          <Button onClick={handleReceiveBundle} disabled={bundleLoading} className="w-full">
            {bundleLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Log Bundle Batch Received
          </Button>
        </div>
      )}
    </div>
  )
}
