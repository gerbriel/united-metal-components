'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, Eye, EyeOff, Loader2 } from 'lucide-react'
import { CUSTOMER_TYPE_LABEL, type CustomerType } from '@/lib/pricing-tiers'

// Account-type accent colors for the row badge.
const TYPE_BADGE: Record<CustomerType, string> = {
  retail: 'bg-blue-100 text-blue-800',
  contractor: 'bg-orange-100 text-orange-800',
  ag: 'bg-green-100 text-green-800',
}

export interface PricingTierRow {
  id: number
  key: string
  label: string
  customer_type: CustomerType
  sort_order: number
  active: boolean
  usageCount: number
}

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')

const emptyForm = { label: '', key: '', customer_type: 'retail' as CustomerType, active: true }

export default function PricingTierManager({ initial }: { initial: PricingTierRow[] }) {
  const [rows, setRows] = useState<PricingTierRow[]>(initial)
  const [busy, setBusy] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<PricingTierRow | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [keyTouched, setKeyTouched] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  // Resync when the server sends fresh data (render-time, no effect).
  const [prevInitial, setPrevInitial] = useState(initial)
  if (initial !== prevInitial) {
    setPrevInitial(initial)
    setRows(initial)
  }

  const openAdd = () => {
    setEditing(null)
    setForm(emptyForm)
    setKeyTouched(false)
    setDialogOpen(true)
  }
  const openEdit = (t: PricingTierRow) => {
    setEditing(t)
    setForm({ label: t.label, key: t.key, customer_type: t.customer_type, active: t.active })
    setKeyTouched(true) // never auto-change an existing key
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.label.trim()) { toast.error('Label is required'); return }
    const key = (form.key || slugify(form.label)).trim()
    if (!key) { toast.error('Key is required'); return }
    setBusy(true)

    if (editing) {
      // Key is immutable in the UI (it's the stored customer value); edit the
      // rest. Changing it would require an FK cascade we don't expose here.
      const { error } = await supabase
        .from('pricing_tiers')
        .update({ label: form.label.trim(), customer_type: form.customer_type, active: form.active })
        .eq('id', editing.id)
      if (error) { toast.error('Failed to save tier'); setBusy(false); return }
      toast.success('Tier updated')
    } else {
      const nextOrder = rows.reduce((m, t) => Math.max(m, t.sort_order), 0) + 10
      const { error } = await supabase
        .from('pricing_tiers')
        .insert({ key, label: form.label.trim(), customer_type: form.customer_type, active: form.active, sort_order: nextOrder })
      if (error) {
        toast.error(/duplicate|unique/i.test(error.message) ? 'That key already exists' : 'Failed to add tier')
        setBusy(false); return
      }
      toast.success('Tier added')
    }
    setDialogOpen(false)
    setBusy(false)
    router.refresh()
  }

  const move = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir
    if (j < 0 || j >= rows.length) return
    const a = rows[idx], b = rows[j]
    const next = [...rows]
    next[idx] = b; next[j] = a
    setRows(next)
    const { error: e1 } = await supabase.from('pricing_tiers').update({ sort_order: b.sort_order }).eq('id', a.id)
    const { error: e2 } = await supabase.from('pricing_tiers').update({ sort_order: a.sort_order }).eq('id', b.id)
    if (e1 || e2) toast.error('Failed to reorder')
    router.refresh()
  }

  const toggleActive = async (t: PricingTierRow) => {
    setRows((rs) => rs.map((r) => (r.id === t.id ? { ...r, active: !r.active } : r)))
    const { error } = await supabase.from('pricing_tiers').update({ active: !t.active }).eq('id', t.id)
    if (error) toast.error('Failed to update')
    router.refresh()
  }

  const remove = async (t: PricingTierRow) => {
    if (t.usageCount > 0) {
      toast.error(`${t.usageCount} customer${t.usageCount === 1 ? ' is' : 's are'} on "${t.label}" — reassign or deactivate it first`)
      return
    }
    if (!confirm(`Delete pricing tier "${t.label}"? This can't be undone.`)) return
    setBusy(true)
    const { error } = await supabase.from('pricing_tiers').delete().eq('id', t.id)
    if (error) { toast.error('Failed to delete tier'); setBusy(false); return }
    toast.success('Tier deleted')
    setBusy(false)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openAdd} className="gap-1.5"><Plus className="w-4 h-4" />Add Tier</Button>
      </div>

      <Card className="divide-y">
        {rows.length === 0 && <p className="p-6 text-sm text-muted-foreground">No pricing tiers yet.</p>}
        {rows.map((t, i) => (
          <div key={t.id} className={`flex items-center gap-3 p-3 ${t.active ? '' : 'opacity-55'}`}>
            <div className="flex flex-col">
              <button onClick={() => move(i, -1)} disabled={i === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                <ChevronUp className="w-4 h-4" />
              </button>
              <button onClick={() => move(i, 1)} disabled={i === rows.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
            <Badge
              variant="secondary"
              className={`text-xs shrink-0 ${TYPE_BADGE[t.customer_type] ?? TYPE_BADGE.retail}`}
            >
              {CUSTOMER_TYPE_LABEL[t.customer_type] ?? 'Retail'}
            </Badge>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">{t.label}</p>
              <p className="text-xs text-muted-foreground truncate font-mono">{t.key}</p>
            </div>
            {t.usageCount > 0 && (
              <Badge variant="secondary" className="text-xs shrink-0">{t.usageCount} customer{t.usageCount === 1 ? '' : 's'}</Badge>
            )}
            <button onClick={() => toggleActive(t)} title={t.active ? 'Active — offered in pickers' : 'Inactive — hidden from pickers'}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
              {t.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            <button onClick={() => openEdit(t)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => remove(t)} disabled={busy}
              className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600 disabled:opacity-40">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Pricing Tier' : 'Add Pricing Tier'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Label *</Label>
              <Input
                value={form.label}
                onChange={(e) => {
                  const label = e.target.value
                  setForm((f) => ({ ...f, label, key: keyTouched ? f.key : slugify(label) }))
                }}
                placeholder="e.g. Contractor (Volume)"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Account Type *</Label>
              <Select
                value={form.customer_type}
                onValueChange={(v: string | null) => v && setForm((f) => ({ ...f, customer_type: v as CustomerType }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="retail">Retail (One-off Customer)</SelectItem>
                  <SelectItem value="contractor">Contractor</SelectItem>
                  <SelectItem value="ag">Agricultural</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Key</Label>
              <Input
                value={form.key}
                onChange={(e) => { setKeyTouched(true); setForm((f) => ({ ...f, key: slugify(e.target.value) })) }}
                disabled={!!editing}
                placeholder="contractor_volume"
              />
              <p className="text-xs text-muted-foreground">
                {editing ? 'The key is fixed once created (it identifies assigned customers).' : 'Stored on each customer — letters, numbers, and underscores.'}
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
              Active (offered when assigning tiers)
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={busy}>
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? 'Save Changes' : 'Add Tier'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
