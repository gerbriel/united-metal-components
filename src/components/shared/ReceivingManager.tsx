'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, CheckCircle2 } from 'lucide-react'

interface TubeProduct { id: number; name: string }

interface Props {
  tubeProducts: TubeProduct[]
}

const STANDARD_LENGTHS = [20, 22, 24, 26, 30]

const EMPTY_COIL = {
  coil_identifier:     '',
  coil_category:       'panel' as 'panel' | 'hat_channel_brace' | 'tube',
  gauge:               '' as '12' | '14' | '',
  color:               '',
  astm_code:           '',
  initial_weight_lbs:  '',
  lbs_per_linear_foot: '',
  notes:               '',
}

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

export default function ReceivingManager({ tubeProducts }: Props) {
  const [tab, setTab]           = useState<'coil' | 'bundle'>('coil')
  const [coilForm, setCoilForm] = useState(EMPTY_COIL)
  const [bundleForm, setBundleForm] = useState(EMPTY_BUNDLE)
  const [coilLoading, setCoilLoading]   = useState(false)
  const [bundleLoading, setBundleLoading] = useState(false)
  const [lastCoil, setLastCoil]   = useState<string | null>(null)
  const [lastBundle, setLastBundle] = useState<string | null>(null)

  const supabase = createClient()

  const setC = (k: keyof typeof EMPTY_COIL) => (v: string | null) =>
    setCoilForm((f) => ({ ...f, [k]: v ?? '' }))

  const setB = (k: keyof typeof EMPTY_BUNDLE) => (v: string | null) =>
    setBundleForm((f) => ({ ...f, [k]: v ?? '' }))

  const handleReceiveCoil = async () => {
    if (!coilForm.initial_weight_lbs || !coilForm.lbs_per_linear_foot) {
      toast.error('Initial weight and lbs/ft are required')
      return
    }
    if (coilForm.coil_category === 'tube' && !coilForm.gauge) {
      toast.error('Gauge is required for tube coils')
      return
    }
    setCoilLoading(true)
    const { error } = await supabase.from('product_coils').insert({
      coil_identifier:     coilForm.coil_identifier || null,
      coil_category:       coilForm.coil_category,
      gauge:               coilForm.coil_category === 'tube' ? coilForm.gauge || null : null,
      color:               coilForm.color || null,
      astm_code:           coilForm.astm_code || null,
      initial_weight_lbs:  parseFloat(coilForm.initial_weight_lbs),
      lbs_per_linear_foot: parseFloat(coilForm.lbs_per_linear_foot),
      notes:               coilForm.notes || null,
    })
    if (error) { toast.error(error.message); setCoilLoading(false); return }
    const label = coilForm.coil_identifier
      ? `Coil ${coilForm.coil_identifier}`
      : `${coilForm.coil_category.replace('_', ' ')} coil`
    setLastCoil(`${label} — ${fmtFeet(parseFloat(coilForm.initial_weight_lbs) / parseFloat(coilForm.lbs_per_linear_foot))} est.`)
    toast.success('Coil received')
    setCoilForm(EMPTY_COIL)
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
      {/* Tab switcher */}
      <div className="flex rounded-lg border overflow-hidden w-fit">
        {(['coil', 'bundle'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 text-sm font-medium transition-colors ${
              tab === t ? 'bg-primary text-primary-foreground' : 'bg-white hover:bg-muted text-muted-foreground'
            }`}
          >
            {t === 'coil' ? 'Receive Coil' : 'Receive Tube Bundles'}
          </button>
        ))}
      </div>

      {/* ── Coil form ──────────────────────────────────────────── */}
      {tab === 'coil' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Log a new coil from a shipment. Coil ID and ASTM code are optional — add them if available on the delivery slip.
          </p>

          {lastCoil && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Last received: {lastCoil}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <Select value={coilForm.coil_category} onValueChange={setC('coil_category')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="panel">Panel</SelectItem>
                  <SelectItem value="hat_channel_brace">Hat Channel / Brace</SelectItem>
                  <SelectItem value="tube">Tube</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {coilForm.coil_category === 'tube' && (
              <div className="space-y-1.5">
                <Label>Gauge *</Label>
                <Select value={coilForm.gauge} onValueChange={setC('gauge')}>
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

            <div className="space-y-1.5">
              <Label>Color</Label>
              <Input
                value={coilForm.color}
                onChange={(e) => setC('color')(e.target.value)}
                placeholder="e.g. Galvalume, Bright Red"
              />
            </div>

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
              <Input
                value={coilForm.astm_code}
                onChange={(e) => setC('astm_code')(e.target.value)}
                placeholder="e.g. A1011 CS Type B"
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
