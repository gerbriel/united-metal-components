'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Pencil, Loader2, Archive, ArchiveRestore } from 'lucide-react'
import { swatchStyle, type FinishClass } from '@/lib/product-config'

// One row of the DB `finishes` table (all columns the manager touches). The live
// picker palette (useFinishes) reads a subset of this — name/hex/text_dark/
// gradient/texture/finish_class — so editing here changes what pickers render.
export interface FinishRow {
  id: number
  name: string
  slug: string
  hex: string
  text_dark: boolean
  gradient: string | null
  texture: string | null
  finish_class: FinishClass
  active: boolean
  sort: number
}

// name → stable slug key: lowercase, non-alphanumerics collapse to single hyphens.
// Matches the migration-055 seed ('Dark Stone' → 'dark-stone').
const slugify = (s: string) =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

const FINISH_CLASSES: { value: FinishClass; label: string }[] = [
  { value: 'galvalume', label: 'Galvalume (bare metal)' },
  { value: 'solid', label: 'Solid (painted)' },
  { value: 'pattern', label: 'Pattern (printed)' },
]

const EMPTY: Omit<FinishRow, 'id'> = {
  name: '',
  slug: '',
  hex: '#CCCCCC',
  text_dark: true,
  gradient: null,
  texture: null,
  finish_class: 'solid',
  active: true,
  sort: 0,
}

// Add / edit dialog for a single finish. Isolated form state, reset from the row
// each time the dialog opens so a cancelled edit doesn't leak into the next open.
function FinishDialog({
  finish,
  mode,
  nextSort,
}: {
  finish?: FinishRow
  mode: 'add' | 'edit'
  nextSort: number
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<Omit<FinishRow, 'id'>>(EMPTY)
  const supabase = createClient()
  const router = useRouter()

  // Seed the form from the row (or a blank add form) whenever the dialog opens.
  const onOpenChange = (next: boolean) => {
    if (next) {
      setForm(finish ? { ...finish } : { ...EMPTY, sort: nextSort })
    }
    setOpen(next)
  }

  const setField = <K extends keyof Omit<FinishRow, 'id'>>(k: K, v: Omit<FinishRow, 'id'>[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async () => {
    const name = form.name.trim()
    const hex = form.hex.trim()
    if (!name) { toast.error('Name is required'); return }
    if (!hex) { toast.error('Hex color is required'); return }
    setLoading(true)

    // Shared editable columns. Optional text fields normalize '' → null.
    const base = {
      name,
      hex,
      text_dark: form.text_dark,
      gradient: form.gradient?.trim() || null,
      texture: form.texture?.trim() || null,
      finish_class: form.finish_class,
      active: form.active,
      sort: Number(form.sort) || 0,
      updated_at: new Date().toISOString(),
    }

    if (mode === 'edit' && finish) {
      // Slug is a stable key — don't regenerate it on rename.
      const { error } = await supabase.from('finishes').update(base).eq('id', finish.id)
      if (error) {
        toast.error(/duplicate|unique/i.test(error.message) ? 'A finish with that name already exists' : 'Failed to save finish')
        setLoading(false)
        return
      }
      toast.success('Finish updated')
    } else {
      const slug = slugify(name) || `finish-${Date.now()}`
      const { error } = await supabase.from('finishes').insert({ ...base, slug })
      if (error) {
        toast.error(/duplicate|unique/i.test(error.message) ? 'A finish with that name already exists' : 'Failed to add finish')
        setLoading(false)
        return
      }
      toast.success('Finish added')
    }

    setOpen(false)
    setLoading(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {mode === 'add' ? (
        <DialogTrigger render={
          <button className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/80 transition-colors">
            <Plus className="w-4 h-4" />Add Finish
          </button>
        } />
      ) : (
        <DialogTrigger render={
          <button className="inline-flex items-center justify-center h-7 w-7 rounded-lg hover:bg-muted transition-colors" title="Edit finish">
            <Pencil className="w-3 h-3" />
          </button>
        } />
      )}
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Add Finish' : 'Edit Finish'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="col-span-2 space-y-1.5">
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="e.g. Barn Red" />
          </div>

          <div className="space-y-1.5">
            <Label>Hex color *</Label>
            <div className="flex items-center gap-2">
              <span
                className="w-9 h-9 rounded-lg border border-slate-200 shrink-0 overflow-hidden"
                style={swatchStyle({ hex: form.hex, gradient: form.gradient ?? undefined, texture: form.texture ?? undefined })}
              />
              <Input value={form.hex} onChange={(e) => setField('hex', e.target.value)} placeholder="#7C2A24" className="font-mono" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Finish class</Label>
            <Select value={form.finish_class} onValueChange={(v: string | null) => v && setField('finish_class', v as FinishClass)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FINISH_CLASSES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2 space-y-1.5">
            <Label>Gradient <span className="text-muted-foreground font-normal">(optional — swatch sheen, e.g. metallic)</span></Label>
            <Input value={form.gradient ?? ''} onChange={(e) => setField('gradient', e.target.value || null)} placeholder="linear-gradient(135deg, …)" className="font-mono text-xs" />
          </div>

          <div className="col-span-2 space-y-1.5">
            <Label>Texture <span className="text-muted-foreground font-normal">(optional — printed-pattern image path)</span></Label>
            <Input value={form.texture ?? ''} onChange={(e) => setField('texture', e.target.value || null)} placeholder="/textures/dark-stone.jpg" className="font-mono text-xs" />
          </div>

          <div className="space-y-1.5">
            <Label>Sort</Label>
            <Input type="number" value={String(form.sort)} onChange={(e) => setField('sort', Number(e.target.value) || 0)} />
          </div>

          <div className="flex flex-col justify-end gap-2 pb-1">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.text_dark} onChange={(e) => setField('text_dark', e.target.checked)} />
              Dark label text
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.active} onChange={(e) => setField('active', e.target.checked)} />
              Active (shown in pickers)
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {mode === 'add' ? 'Add Finish' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function FinishesManager({ initial }: { initial: FinishRow[] }) {
  const supabase = createClient()
  const router = useRouter()
  const [busyId, setBusyId] = useState<number | null>(null)

  // Next sort value for a new finish — one step past the current max.
  const nextSort = (initial.reduce((m, f) => Math.max(m, f.sort), 0) || 0) + 10

  // Archive = active:false (hidden from pickers, keeps labeling data); restore flips it back.
  const setActive = async (finish: FinishRow, active: boolean) => {
    setBusyId(finish.id)
    const { error } = await supabase.from('finishes')
      .update({ active, updated_at: new Date().toISOString() }).eq('id', finish.id)
    if (error) { toast.error('Failed to update finish'); setBusyId(null); return }
    toast.success(active ? 'Finish restored' : 'Finish archived')
    setBusyId(null)
    router.refresh()
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <FinishDialog mode="add" nextSort={nextSort} />
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b bg-slate-50">
              <th className="text-left p-3 font-medium">Swatch</th>
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium whitespace-nowrap">Finish class</th>
              <th className="text-left p-3 font-medium whitespace-nowrap">Hex</th>
              <th className="text-right p-3 font-medium">Sort</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-right p-3 font-medium">Edit</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {initial.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No finishes yet. Add one above.</td></tr>
            )}
            {initial.map((f) => (
              <tr key={f.id} className={`hover:bg-slate-50/60 ${f.active ? '' : 'opacity-50'}`}>
                <td className="p-3">
                  <span
                    className="inline-block w-7 h-7 rounded-full border border-slate-200 overflow-hidden align-middle"
                    style={swatchStyle({ hex: f.hex, gradient: f.gradient ?? undefined, texture: f.texture ?? undefined })}
                  />
                </td>
                <td className="p-3">
                  <p className="font-medium leading-tight">{f.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{f.slug}</p>
                </td>
                <td className="p-3 capitalize whitespace-nowrap">{f.finish_class}</td>
                <td className="p-3 font-mono text-xs">{f.hex}</td>
                <td className="p-3 text-right tabular-nums">{f.sort}</td>
                <td className="p-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${f.active ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-600'}`}>
                    {f.active ? 'Active' : 'Archived'}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-end gap-1">
                    <FinishDialog mode="edit" finish={f} nextSort={nextSort} />
                    <button
                      className="inline-flex items-center justify-center h-7 w-7 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
                      title={f.active ? 'Archive' : 'Restore'}
                      onClick={() => setActive(f, !f.active)}
                      disabled={busyId === f.id}
                    >
                      {busyId === f.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : f.active
                          ? <Archive className="w-3.5 h-3.5" />
                          : <ArchiveRestore className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
