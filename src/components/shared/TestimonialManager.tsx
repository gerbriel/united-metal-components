'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, Eye, EyeOff, Loader2, Star } from 'lucide-react'
import type { Testimonial } from '@/types/database'

// First letters of the first two words — matches the avatar the home page shows.
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

interface Form {
  name: string
  role: string
  company: string
  content: string
  rating: number
  active: boolean
}
const EMPTY: Form = { name: '', role: '', company: '', content: '', rating: 5, active: true }

function StarRating({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} star${n === 1 ? '' : 's'}`}
          className="p-0.5 text-orange-400 hover:scale-110 transition-transform">
          <Star className={`w-5 h-5 ${n <= value ? 'fill-orange-400' : 'fill-transparent text-slate-300'}`} />
        </button>
      ))}
    </div>
  )
}

export default function TestimonialManager({ initial }: { initial: Testimonial[] }) {
  const [rows, setRows] = useState<Testimonial[]>(initial)
  const [busy, setBusy] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Testimonial | null>(null)
  const [form, setForm] = useState<Form>(EMPTY)
  const supabase = createClient()
  const router = useRouter()

  // Resync when the server sends fresh data (render-time, no effect).
  const [prevInitial, setPrevInitial] = useState(initial)
  if (initial !== prevInitial) { setPrevInitial(initial); setRows(initial) }

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }))

  const openAdd = () => { setEditing(null); setForm(EMPTY); setDialogOpen(true) }
  const openEdit = (t: Testimonial) => {
    setEditing(t)
    setForm({ name: t.name, role: t.role ?? '', company: t.company ?? '', content: t.content, rating: t.rating, active: t.active })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return }
    if (!form.content.trim()) { toast.error('The quote is required'); return }
    setBusy(true)
    const payload = {
      name: form.name.trim(),
      role: form.role.trim() || null,
      company: form.company.trim() || null,
      content: form.content.trim(),
      rating: form.rating,
      active: form.active,
    }
    if (editing) {
      const { error } = await supabase.from('testimonials')
        .update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editing.id)
      if (error) { toast.error('Failed to save testimonial'); setBusy(false); return }
      toast.success('Testimonial saved')
    } else {
      const nextOrder = rows.reduce((m, t) => Math.max(m, t.sort_order), 0) + 10
      const { error } = await supabase.from('testimonials').insert({ ...payload, sort_order: nextOrder })
      if (error) { toast.error('Failed to add testimonial'); setBusy(false); return }
      toast.success('Testimonial added')
    }
    setDialogOpen(false); setBusy(false); router.refresh()
  }

  const move = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir
    if (j < 0 || j >= rows.length) return
    const a = rows[idx], b = rows[j]
    const next = [...rows]
    next[idx] = b; next[j] = a
    setRows(next)
    const { error: e1 } = await supabase.from('testimonials').update({ sort_order: b.sort_order }).eq('id', a.id)
    const { error: e2 } = await supabase.from('testimonials').update({ sort_order: a.sort_order }).eq('id', b.id)
    if (e1 || e2) toast.error('Failed to reorder')
    router.refresh()
  }

  const toggleActive = async (t: Testimonial) => {
    setRows((rs) => rs.map((r) => (r.id === t.id ? { ...r, active: !r.active } : r)))
    const { error } = await supabase.from('testimonials')
      .update({ active: !t.active, updated_at: new Date().toISOString() }).eq('id', t.id)
    if (error) toast.error('Failed to update')
    router.refresh()
  }

  const remove = async (t: Testimonial) => {
    if (!confirm(`Delete the testimonial from “${t.name}”? This can't be undone.`)) return
    setBusy(true)
    const { error } = await supabase.from('testimonials').delete().eq('id', t.id)
    if (error) { toast.error('Failed to delete'); setBusy(false); return }
    toast.success('Testimonial deleted'); setBusy(false); router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openAdd} className="gap-1.5"><Plus className="w-4 h-4" />Add testimonial</Button>
      </div>

      <Card className="divide-y">
        {rows.length === 0 && (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No testimonials yet. Add one to show it in the home-page carousel.
          </p>
        )}
        {rows.map((t, i) => (
          <div key={t.id} className={`flex items-start gap-3 p-3 ${t.active ? '' : 'opacity-55'}`}>
            <div className="flex flex-col pt-1">
              <button onClick={() => move(i, -1)} disabled={i === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                <ChevronUp className="w-4 h-4" />
              </button>
              <button onClick={() => move(i, 1)} disabled={i === rows.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-white">
              {initialsOf(t.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold">{t.name}</p>
                <span className="flex shrink-0 items-center gap-0.5">
                  {Array.from({ length: t.rating }).map((_, s) => (
                    <Star key={s} className="w-3 h-3 fill-orange-400 text-orange-400" />
                  ))}
                </span>
              </div>
              {(t.role || t.company) && (
                <p className="truncate text-xs text-muted-foreground">{[t.role, t.company].filter(Boolean).join(', ')}</p>
              )}
              <p className="mt-1 line-clamp-2 text-sm text-foreground/80">“{t.content}”</p>
            </div>
            <div className="flex shrink-0 items-center">
              <button onClick={() => toggleActive(t)} title={t.active ? 'Shown on the site' : 'Hidden from the site'}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
                {t.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <button onClick={() => openEdit(t)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => remove(t)} disabled={busy}
                className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600 disabled:opacity-40 dark:hover:bg-red-950">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit testimonial' : 'Add testimonial'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Mike Rodriguez" />
              </div>
              <div className="space-y-1.5">
                <Label>Rating</Label>
                <StarRating value={form.rating} onChange={(n) => set('rating', n)} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Input value={form.role} onChange={(e) => set('role', e.target.value)} placeholder="General Contractor" />
              </div>
              <div className="space-y-1.5">
                <Label>Company</Label>
                <Input value={form.company} onChange={(e) => set('company', e.target.value)} placeholder="Rodriguez Construction" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Quote *</Label>
              <Textarea value={form.content} onChange={(e) => set('content', e.target.value)} rows={4}
                placeholder="What did they say about working with you?" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} />
              Active (shown on the home page)
            </label>
          </div>
          <div className="flex justify-end gap-2 border-t pt-3">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={busy}>
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? 'Save changes' : 'Add testimonial'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
