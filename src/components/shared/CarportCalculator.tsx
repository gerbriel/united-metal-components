'use client'

import { Fragment, useMemo, useState } from 'react'
import { Calculator, Plus, Minus, Trash2, Settings2, Printer, RotateCcw, Truck, SlidersHorizontal, ShieldCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { COLORS } from '@/lib/product-config'
import { cn } from '@/lib/utils'
import { calculateBom } from '@/lib/carport/calc'
import type { BomCategory, CarportInput, RollUpDoor } from '@/lib/carport/types'
import { DEFAULT_RULES, RULE_FIELDS, type RuleSet } from '@/lib/carport/rules'

interface Props {
  variant?: 'dashboard' | 'public'
}

const ROOF_STYLES: { value: CarportInput['roofStyle']; label: string }[] = [
  { value: 'standard', label: 'Standard (single slope)' },
  { value: 'horizontal', label: 'A-Frame Horizontal' },
  { value: 'vertical', label: 'A-Frame Vertical' },
]

// Install-access fee policy. Situational (crew judgment), so these ride
// along as a note on the estimate rather than a computed line off the dimensions.
const INSTALL_TERMS: string[] = [
  'If the installation truck cannot access the site within 40′ of the building, a $250 labor charge is added to the balance due.',
  'If the truck cannot reach the job site (located an unreasonable distance away), the job may be rescheduled and a $650 return-trip fee applies.',
  'Business or time-restricted installs can affect pricing — notify your sales rep before ordering.',
]

const CATEGORY_ORDER: BomCategory[] = [
  'Roof',
  'Walls',
  'Structure',
  'Trim',
  'Fasteners',
  'Openings',
]

const DEFAULT_INPUT: CarportInput = {
  roofStyle: 'vertical',
  width: 18,
  length: 20,
  legHeight: 7,
  pitch: 3,
  wallOrientation: 'vertical',
  encloseSides: true,
  encloseEnds: true,
  roofColor: 'Forest Green',
  wallColor: 'Forest Green',
  trimColor: 'Hawaiian Blue',
  certification: 'uncertified',
  bracing: 'none',
  extraTrusses: 0,
  extraPurlins: false,
  gauge: 12, // 12ga is the standard frame tube (mirrors the builder's default)
  legStyle: 'auto',
  walkDoors: 0,
  windows: 0,
  rollUps: [],
  groundSnow: 30,
  windSpeed: 105,
}

function ColorSelect({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (v: string) => void
  label: string
}) {
  const selected = COLORS.find((c) => c.name === value)
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={(v) => v && onChange(v)}>
        <SelectTrigger className="w-full">
          <SelectValue>
            <span className="flex items-center gap-2">
              {selected && (
                <span
                  className="inline-block w-3.5 h-3.5 rounded-sm ring-1 ring-black/10"
                  style={{ background: selected.hex }}
                />
              )}
              {value}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {COLORS.map((c) => (
            <SelectItem key={c.name} value={c.name}>
              <span
                className="inline-block w-3.5 h-3.5 rounded-sm ring-1 ring-black/10"
                style={{ background: c.hex }}
              />
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function NumberField({
  label,
  value,
  onChange,
  min = 0,
  step = 1,
  suffix,
}: {
  label: string
  value: number
  onChange: (n: number) => void
  min?: number
  step?: number
  suffix?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          type="number"
          inputMode="decimal"
          min={min}
          step={step}
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T
  options: { id: T; label: string }[]
  onChange: (v: T) => void
  disabled?: boolean
}) {
  return (
    <div className={cn('inline-flex w-full rounded-lg border bg-muted/40 p-0.5', disabled && 'opacity-60')}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          disabled={disabled}
          onClick={() => onChange(o.id)}
          className={cn(
            'flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            value === o.id
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
            disabled && 'cursor-not-allowed hover:text-muted-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Stepper({
  value,
  onChange,
  min = 0,
}: {
  value: number
  onChange: (n: number) => void
  min?: number
}) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onChange(Math.max(min, value - 1))}>
        <Minus className="h-4 w-4" />
      </Button>
      <span className="w-8 text-center text-sm font-semibold tabular-nums">{value}</span>
      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onChange(value + 1)}>
        <Plus className="h-4 w-4" />
      </Button>
      {value > min && (
        <button
          type="button"
          className="ml-1 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => onChange(min)}
        >
          reset
        </button>
      )}
    </div>
  )
}

export default function CarportCalculator({ variant = 'dashboard' }: Props) {
  const [input, setInput] = useState<CarportInput>(DEFAULT_INPUT)
  const [rules, setRules] = useState<RuleSet>(DEFAULT_RULES)
  const [showAssumptions, setShowAssumptions] = useState(false)
  const [showLoads, setShowLoads] = useState(false)
  const [showEngineering, setShowEngineering] = useState(false)

  const set = <K extends keyof CarportInput>(key: K, val: CarportInput[K]) =>
    setInput((prev) => ({ ...prev, [key]: val }))

  const result = useMemo(() => calculateBom(input, rules), [input, rules])

  const addRollUp = () =>
    set('rollUps', [...input.rollUps, { width: 8, height: 8 }])
  const updateRollUp = (i: number, patch: Partial<RollUpDoor>) =>
    set('rollUps', input.rollUps.map((d, idx) => (idx === i ? { ...d, ...patch } : d)))
  const removeRollUp = (i: number) =>
    set('rollUps', input.rollUps.filter((_, idx) => idx !== i))

  const rulesDirty = RULE_FIELDS.some((f) => rules[f.key] !== DEFAULT_RULES[f.key])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold">Carport Material Calculator</h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="w-4 h-4" /> Print
        </Button>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-6">
        {/* ------- Inputs ------- */}
        <div className="space-y-4 print:hidden">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Building</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Roof style</Label>
                <Select
                  value={input.roofStyle}
                  onValueChange={(v) => v && set('roofStyle', v as CarportInput['roofStyle'])}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROOF_STYLES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Width" suffix="ft" value={input.width} onChange={(n) => set('width', n)} />
                <NumberField label="Length" suffix="ft" value={input.length} onChange={(n) => set('length', n)} />
                <NumberField label="Leg height" suffix="ft" value={input.legHeight} onChange={(n) => set('legHeight', n)} />
                <NumberField label="Roof pitch" suffix="/12" value={input.pitch} onChange={(n) => set('pitch', n)} />
              </div>

              <div className="space-y-1.5">
                <Label>Steel gauge</Label>
                <Segmented
                  value={String(input.gauge ?? 12)}
                  options={[
                    { id: '12', label: '12 Gauge (Std)' },
                    { id: '14', label: '14 Gauge' },
                  ]}
                  onChange={(v) => set('gauge', Number(v) as 12 | 14)}
                />
                <p className="text-xs text-muted-foreground">12 ga is heavier steel — counts as heavy-duty (double legs).</p>
              </div>

              <div className="space-y-1.5">
                <Label>Wall panel orientation</Label>
                <Select
                  value={input.wallOrientation}
                  onValueChange={(v) => v && set('wallOrientation', v as CarportInput['wallOrientation'])}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="horizontal">Horizontal</SelectItem>
                    <SelectItem value="vertical">Vertical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap gap-4 pt-1">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-primary w-4 h-4"
                    checked={input.encloseSides}
                    onChange={(e) => set('encloseSides', e.target.checked)}
                  />
                  Enclose side walls
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-primary w-4 h-4"
                    checked={input.encloseEnds}
                    onChange={(e) => set('encloseEnds', e.target.checked)}
                  />
                  Enclose end walls
                </label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <button
                type="button"
                className="flex w-full items-center justify-between text-left"
                onClick={() => setShowEngineering((s) => !s)}
              >
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Engineering
                </CardTitle>
                <span className="text-xs text-muted-foreground">
                  {input.certification === 'local_code' ? 'Built to code' : 'Uncertified'} ·{' '}
                  {result.meta.bracing === 'diagonal' ? 'Braced' : 'No braces'}
                  <span className="ml-2">{showEngineering ? 'Hide' : 'Edit'}</span>
                </span>
              </button>
            </CardHeader>
            {showEngineering && (
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Certification</Label>
                  <Segmented
                    value={input.certification ?? 'uncertified'}
                    options={[
                      { id: 'uncertified', label: 'Uncertified' },
                      { id: 'local_code', label: 'Built To Local Code' },
                    ]}
                    onChange={(v) => set('certification', v)}
                  />
                </div>

                {(() => {
                  const certified = input.certification === 'local_code'
                  const forced = certified || (input.windSpeed ?? 105) >= 140
                  return (
                    <div className="space-y-1.5">
                      <Label>Side bracing</Label>
                      <Segmented
                        value={result.meta.bracing}
                        options={[
                          { id: 'none', label: 'None' },
                          { id: 'diagonal', label: 'Diagonal Braces' },
                        ]}
                        onChange={(v) => set('bracing', v)}
                        disabled={forced}
                      />
                      <p className="text-xs text-muted-foreground">
                        {forced
                          ? certified
                            ? 'Required while certified — set Uncertified to remove braces.'
                            : `Required at ${input.windSpeed} mph (≥ 140).`
                          : result.meta.bracingRecommended
                            ? 'Recommended for this size / loads.'
                            : 'Optional.'}
                      </p>
                    </div>
                  )
                })()}

                {/* Leg (column) style — Auto keeps the derived logic; override to force a type */}
                <div className="space-y-1.5">
                  <Label>Leg style</Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      [
                        ['auto', 'Auto (recommended)'],
                        ['single', 'Single Post'],
                        ['double', 'Double'],
                        ['ladder', 'Ladder (built-up)'],
                        ['zigzag', 'ZigZag (built-up)'],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => set('legStyle', id)}
                        className={cn(
                          'rounded-md border px-2.5 py-1.5 text-left text-xs font-medium transition-colors',
                          (input.legStyle ?? 'auto') === id
                            ? 'border-primary bg-primary/10 text-foreground'
                            : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {(input.legStyle ?? 'auto') === 'auto' && (
                    <p className="text-xs text-muted-foreground">
                      Auto derives the legs from width / height / gauge / certification.
                    </p>
                  )}
                </div>

                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="accent-primary w-4 h-4"
                    checked={!!input.extraPurlins}
                    onChange={(e) => set('extraPurlins', e.target.checked)}
                  />
                  Extra purlins
                  <span className="text-xs text-muted-foreground">tightens roof purlins to ≤18″ o.c.</span>
                </label>

                {/* Auto-derived engineering package */}
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Engineering package <span className="font-normal normal-case tracking-normal">· per stamped load schedules</span>
                  </p>
                  <div className="space-y-1">
                    {[
                      {
                        label: 'Legs',
                        value: { standard: 'Standard legs', double: 'Double legs', ladder: 'Ladder legs', zigzag: 'ZigZag legs' }[result.meta.legType],
                        why: result.meta.legReason,
                      },
                      {
                        label: 'Trusses',
                        value: input.roofStyle === 'standard' ? 'Rounded bow' : result.meta.widespan ? 'Webbed A-frame' : 'Peak-brace A-frame',
                        why: result.meta.trussReason,
                      },
                      {
                        label: 'Frames',
                        value: `${Math.round(result.meta.frameSpacingFt * 12)}″ o.c.`,
                        why: `${input.groundSnow ?? 30} psf · ${input.windSpeed ?? 105} mph${result.meta.certified ? ' · certified' : ''}`,
                      },
                      { label: 'Purlins', value: `${Math.round(result.meta.purlinSpacingFt * 12)}″ o.c.`, why: 'roof' },
                      { label: 'Girts', value: `${Math.round(result.meta.girtSpacingFt * 12)}″ o.c.`, why: 'walls' },
                      {
                        label: 'Bracing',
                        value: result.meta.bracing === 'diagonal' ? 'Diagonal sway braces' : 'None',
                        why: result.meta.bracingReason,
                      },
                    ].map((r) => (
                      <div key={r.label} className="flex items-baseline justify-between gap-2">
                        <span className="w-14 shrink-0 text-xs text-muted-foreground">{r.label}</span>
                        <span className="flex-1 text-xs font-semibold">{r.value}</span>
                        <span className="shrink-0 text-[11px] italic text-muted-foreground">{r.why}</span>
                      </div>
                    ))}
                  </div>
                  {!result.meta.loadAllowed && (
                    <p className="mt-2 text-[11px] leading-snug text-amber-700">
                      ⚠ {input.groundSnow ?? 30} psf @ {input.windSpeed ?? 105} mph exceeds the standard schedule for this building — requires site-specific engineering.
                    </p>
                  )}
                </div>
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <button
                type="button"
                className="flex w-full items-center justify-between text-left"
                onClick={() => setShowLoads((s) => !s)}
              >
                <CardTitle className="text-base flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4" /> Loads &amp; framing
                </CardTitle>
                <span className="text-xs text-muted-foreground">
                  {input.groundSnow ?? 30} psf · {input.windSpeed ?? 105} mph
                  {(input.extraTrusses ?? 0) > 0 ? ` · +${input.extraTrusses} trusses` : ''}
                  <span className="ml-2">{showLoads ? 'Hide' : 'Edit'}</span>
                </span>
              </button>
            </CardHeader>
            {showLoads && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <NumberField label="Ground snow" suffix="psf" value={input.groundSnow ?? 30} onChange={(n) => set('groundSnow', n)} />
                  <NumberField label="Wind speed" suffix="mph" value={input.windSpeed ?? 105} onChange={(n) => set('windSpeed', n)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Extra trusses <span className="text-muted-foreground font-normal">· added beyond load spacing</span></Label>
                  <Stepper value={input.extraTrusses ?? 0} onChange={(n) => set('extraTrusses', n)} />
                  <p className="text-xs text-muted-foreground">
                    {result.meta.baseTrusses} required by the {result.meta.frameChart ? `${result.meta.frameChart}′ chart` : 'estimate'}
                    {(input.extraTrusses ?? 0) > 0
                      ? ` + ${input.extraTrusses} extra → ${result.meta.trusses} frames justified at ${Math.round(result.meta.frameSpacingFt * 12)}″ o.c.`
                      : ` at ${Math.round(result.meta.frameSpacingFt * 12)}″ o.c. — add extras to tighten spacing evenly.`}
                  </p>
                </div>
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Colors</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <ColorSelect label="Roof" value={input.roofColor} onChange={(v) => set('roofColor', v)} />
              <ColorSelect label="Sides" value={input.wallColor} onChange={(v) => set('wallColor', v)} />
              <ColorSelect label="Trim" value={input.trimColor} onChange={(v) => set('trimColor', v)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Openings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Walk-in doors" value={input.walkDoors} onChange={(n) => set('walkDoors', n)} />
                <NumberField label="Windows" value={input.windows} onChange={(n) => set('windows', n)} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Roll-up doors</Label>
                  <Button variant="outline" size="sm" onClick={addRollUp}>
                    <Plus className="w-4 h-4" /> Add
                  </Button>
                </div>
                {input.rollUps.length === 0 && (
                  <p className="text-xs text-muted-foreground">No roll-up doors.</p>
                )}
                {input.rollUps.map((d, i) => (
                  <div key={i} className="flex items-end gap-2">
                    <NumberField label="Width (ft)" value={d.width} onChange={(n) => updateRollUp(i, { width: n })} />
                    <NumberField label="Height (ft)" value={d.height} onChange={(n) => updateRollUp(i, { height: n })} />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => removeRollUp(i)}
                      aria-label="Remove roll-up door"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ------- Results ------- */}
        <div className="space-y-4">
          {result.warnings.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-1 print:hidden">
              {result.warnings.map((w, i) => (
                <p key={i} className="text-sm text-amber-800">⚠️ {w}</p>
              ))}
            </div>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {input.width}′ × {input.length}′ {ROOF_STYLES.find((s) => s.value === input.roofStyle)?.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                {[
                  { label: 'Peak height', value: result.meta.peakHeightLabel },
                  { label: 'Roof panels', value: result.meta.roofPanelCount },
                  {
                    label: result.meta.extraTrusses > 0 ? `Trusses (+${result.meta.extraTrusses})` : 'Trusses',
                    value: result.meta.trusses,
                  },
                  {
                    label: result.meta.frameChart ? `Frame o.c. (${result.meta.frameChart}′ chart)` : 'Frame o.c. (est.)',
                    value: `${Math.round(result.meta.frameSpacingFt * 12)}″`,
                  },
                  { label: 'Total panels', value: result.meta.totalPanels },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg bg-slate-50 border p-3">
                    <p className="text-lg font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Bill of Materials</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="w-32">Color</TableHead>
                    <TableHead className="w-28">Size / Length</TableHead>
                    <TableHead className="text-right w-24">Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {CATEGORY_ORDER.map((cat) => {
                    const rows = result.lines.filter((l) => l.category === cat)
                    if (rows.length === 0) return null
                    return (
                      <Fragment key={cat}>
                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                          <TableCell colSpan={4} className="py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {cat}
                          </TableCell>
                        </TableRow>
                        {rows.map((l, i) => {
                          const swatch = l.color ? COLORS.find((c) => c.name === l.color) : undefined
                          return (
                            <TableRow key={`${cat}-${i}`}>
                              <TableCell className="align-top">
                                <div className="font-medium whitespace-normal">{l.item}</div>
                                {l.detail && (
                                  <div className="text-xs text-muted-foreground whitespace-normal">{l.detail}</div>
                                )}
                              </TableCell>
                              <TableCell className="align-top">
                                {l.color ? (
                                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                                    <span
                                      className="inline-block w-3.5 h-3.5 rounded-sm ring-1 ring-black/10 shrink-0"
                                      style={
                                        swatch?.gradient
                                          ? { backgroundImage: swatch.gradient }
                                          : { background: swatch?.hex ?? '#e2e8f0' }
                                      }
                                    />
                                    {l.color}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="align-top tabular-nums">
                                {l.size ?? <span className="text-muted-foreground">—</span>}
                              </TableCell>
                              <TableCell className="align-top text-right whitespace-nowrap">
                                <span className="tabular-nums font-medium">{l.qty}</span>{' '}
                                <span className="text-muted-foreground">{l.unit}</span>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </Fragment>
                    )
                  })}
                </TableBody>
              </Table>
              {variant === 'public' && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Estimate only — contact us to confirm your final material list and pricing.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Install access fees */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="w-4 h-4" /> Install Access
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                {INSTALL_TERMS.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Editable assumptions */}
          <Card className="print:hidden">
            <CardHeader className="pb-2">
              <button
                type="button"
                className="flex w-full items-center justify-between text-left"
                onClick={() => setShowAssumptions((s) => !s)}
              >
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings2 className="w-4 h-4" /> Assumptions {rulesDirty && <span className="text-xs font-normal text-amber-600">(edited)</span>}
                </CardTitle>
                <span className="text-xs text-muted-foreground">{showAssumptions ? 'Hide' : 'Show'}</span>
              </button>
            </CardHeader>
            {showAssumptions && (
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Best-guess rules from the cheat sheet. Edit any value to re-run the takeoff live.
                </p>
                {(['Panels', 'Trim', 'Structure', 'Fasteners', 'Openings'] as const).map((group) => (
                  <div key={group}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{group}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {RULE_FIELDS.filter((f) => f.group === group).map((f) => (
                        <NumberField
                          key={f.key}
                          label={f.label}
                          suffix={f.suffix}
                          step={0.25}
                          value={rules[f.key]}
                          onChange={(n) => setRules((r) => ({ ...r, [f.key]: n }))}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setRules(DEFAULT_RULES)} disabled={!rulesDirty}>
                  <RotateCcw className="w-4 h-4" /> Reset to defaults
                </Button>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
