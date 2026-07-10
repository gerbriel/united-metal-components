'use client'

import { useState, type ChangeEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Loader2, Save } from 'lucide-react'
import type { TaxRates } from '@/lib/tax'

const FIELDS: { key: keyof TaxRates; settingKey: string; label: string; help: string }[] = [
  { key: 'sales',   settingKey: 'tax_sales_rate',    label: 'Standard sales tax', help: 'Retail & contractor orders' },
  { key: 'federal', settingKey: 'tax_federal_rate',  label: 'Federal (ag)',       help: 'Applied to agricultural sales' },
  { key: 'stateAg', settingKey: 'tax_state_ag_rate', label: 'State ag',           help: 'Applied to agricultural sales' },
]

// Rates are stored as decimals (0.0825) but edited as percents (8.25).
export default function TaxRateSettings({ initial }: { initial: TaxRates }) {
  const [pct, setPct] = useState<Record<keyof TaxRates, string>>({
    sales:   String(initial.sales * 100),
    federal: String(initial.federal * 100),
    stateAg: String(initial.stateAg * 100),
  })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const set = (k: keyof TaxRates) => (e: ChangeEvent<HTMLInputElement>) =>
    setPct((p) => ({ ...p, [k]: e.target.value }))

  const save = async () => {
    const rows = FIELDS.map((f) => ({
      key: f.settingKey,
      value: (parseFloat(pct[f.key]) || 0) / 100,
      updated_at: new Date().toISOString(),
    }))
    if (rows.some((r) => r.value < 0)) { toast.error('Rates can’t be negative'); return }
    setSaving(true)
    const { error } = await supabase.from('app_settings').upsert(rows, { onConflict: 'key' })
    if (error) toast.error('Failed to save tax rates')
    else toast.success('Tax rates saved')
    setSaving(false)
  }

  const agTotal = ((parseFloat(pct.federal) || 0) + (parseFloat(pct.stateAg) || 0)).toFixed(2)

  return (
    <Card className="p-4 space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {FIELDS.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <Label>{f.label}</Label>
            <div className="relative">
              <Input
                inputMode="decimal"
                value={pct[f.key]}
                onChange={set(f.key)}
                className="pr-7 text-right font-mono"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground">{f.help}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Agricultural customers are taxed at federal + state ag ={' '}
        <span className="font-medium text-foreground">{agTotal}%</span> on the retail price. Tax-exempt tiers pay no tax.
      </p>
      <Button onClick={save} disabled={saving} className="gap-1.5">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save tax rates
      </Button>
    </Card>
  )
}
