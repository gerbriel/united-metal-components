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
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, Eye, EyeOff, Loader2, GripVertical } from 'lucide-react'
import { CATEGORY_ICONS, CATEGORY_ICON_NAMES, iconFor } from '@/lib/nav-categories'
import type { ProductCategory } from '@/types/database'

type CatRow = ProductCategory & { productCount: number; activeCount: number }

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

const emptyForm = { name: '', slug: '', icon: 'Package', description: '', nav_visible: true }

export default function CategoryManager({ initial }: { initial: CatRow[] }) {
  const [rows, setRows] = useState<CatRow[]>(initial)
  const [busy, setBusy] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CatRow | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [slugTouched, setSlugTouched] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  // Resync when the server sends fresh data (after router.refresh / realtime).
  // Render-time adjustment rather than an effect (avoids a cascading render).
  const [prevInitial, setPrevInitial] = useState(initial)
  if (initial !== prevInitial) {
    setPrevInitial(initial)
    setRows(initial)
  }

  const openAdd = () => {
    setEditing(null)
    setForm(emptyForm)
    setSlugTouched(false)
    setDialogOpen(true)
  }
  const openEdit = (c: CatRow) => {
    setEditing(c)
    setForm({ name: c.name, slug: c.slug, icon: c.icon ?? 'Package', description: c.description ?? '', nav_visible: c.nav_visible })
    // Start "untouched" so renaming the category re-suggests a matching slug,
    // while a manual slug edit still wins (sets slugTouched → true).
    setSlugTouched(false)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return }
    const slug = (form.slug || slugify(form.name)).trim()
    if (!slug) { toast.error('Slug is required'); return }
    setBusy(true)

    if (editing) {
      const { error } = await supabase
        .from('product_categories')
        .update({ name: form.name.trim(), slug, icon: form.icon, description: form.description.trim() || null, nav_visible: form.nav_visible })
        .eq('id', editing.id)
      if (error) {
        toast.error(/duplicate|unique/i.test(error.message) ? 'That name or slug already exists' : 'Failed to save category')
        setBusy(false); return
      }
      toast.success('Category updated')
    } else {
      const nextOrder = rows.reduce((m, c) => Math.max(m, c.sort_order), -1) + 1
      const { error } = await supabase
        .from('product_categories')
        .insert({ name: form.name.trim(), slug, icon: form.icon, description: form.description.trim() || null, nav_visible: form.nav_visible, sort_order: nextOrder })
      if (error) {
        toast.error(/duplicate|unique/i.test(error.message) ? 'That name or slug already exists' : 'Failed to add category')
        setBusy(false); return
      }
      toast.success('Category added')
    }
    setDialogOpen(false)
    setBusy(false)
    router.refresh()
  }

  const move = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir
    if (j < 0 || j >= rows.length) return
    const a = rows[idx], b = rows[j]
    // Optimistic swap for instant feedback, then persist both sort_orders.
    const next = [...rows]
    next[idx] = b; next[j] = a
    setRows(next)
    const { error: e1 } = await supabase.from('product_categories').update({ sort_order: b.sort_order }).eq('id', a.id)
    const { error: e2 } = await supabase.from('product_categories').update({ sort_order: a.sort_order }).eq('id', b.id)
    if (e1 || e2) { toast.error('Failed to reorder'); }
    router.refresh()
  }

  const toggleVisible = async (c: CatRow) => {
    setRows((rs) => rs.map((r) => (r.id === c.id ? { ...r, nav_visible: !r.nav_visible } : r)))
    const { error } = await supabase.from('product_categories').update({ nav_visible: !c.nav_visible }).eq('id', c.id)
    if (error) toast.error('Failed to update visibility')
    router.refresh()
  }

  const remove = async (c: CatRow) => {
    if (c.productCount > 0) {
      toast.error(`Reassign ${c.productCount} product${c.productCount === 1 ? '' : 's'} out of "${c.name}" first`)
      return
    }
    if (!confirm(`Delete category "${c.name}"? This can't be undone.`)) return
    setBusy(true)
    const { error } = await supabase.from('product_categories').delete().eq('id', c.id)
    if (error) { toast.error('Failed to delete category'); setBusy(false); return }
    toast.success('Category deleted')
    setBusy(false)
    router.refresh()
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openAdd} className="gap-1.5"><Plus className="w-4 h-4" />Add Category</Button>
      </div>

      <Card className="divide-y">
        {rows.length === 0 && <p className="p-6 text-sm text-muted-foreground">No categories yet.</p>}
        {rows.map((c, i) => {
          const Icon = iconFor(c.icon)
          return (
            <div key={c.id} className={`flex items-center gap-3 p-3 ${c.nav_visible ? '' : 'opacity-55'}`}>
              <div className="flex flex-col">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button onClick={() => move(i, 1)} disabled={i === rows.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
              <GripVertical className="w-4 h-4 text-slate-300 hidden sm:block" />
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground truncate">/{c.slug}{c.description ? ` · ${c.description}` : ''}</p>
              </div>
              <Badge variant="secondary" className="text-xs shrink-0">{c.activeCount} live{c.productCount !== c.activeCount ? ` · ${c.productCount} total` : ''}</Badge>
              <button onClick={() => toggleVisible(c)} title={c.nav_visible ? 'Visible in storefront' : 'Hidden from storefront'}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
                {c.nav_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <button onClick={() => openEdit(c)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => remove(c)} disabled={busy}
                className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600 disabled:opacity-40">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        })}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Category' : 'Add Category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value
                  setForm((f) => ({ ...f, name, slug: slugTouched ? f.slug : slugify(name) }))
                }}
                placeholder="e.g. Fasteners"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input
                value={form.slug}
                onChange={(e) => { setSlugTouched(true); setForm((f) => ({ ...f, slug: slugify(e.target.value) })) }}
                placeholder="fasteners"
              />
              <p className="text-xs text-muted-foreground">
                Storefront URL: /products?cat={form.slug || '…'}
                {editing && ' — changing this updates the category’s links'}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Icon</Label>
              <Select value={form.icon} onValueChange={(v: string | null) => v && setForm((f) => ({ ...f, icon: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {CATEGORY_ICON_NAMES.map((name) => {
                    const IconOpt = CATEGORY_ICONS[name]
                    return (
                      <SelectItem key={name} value={name}>
                        <span className="flex items-center gap-2"><IconOpt className="w-4 h-4" />{name}</span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Blurb</Label>
              <Input value={form.description} onChange={set('description')} placeholder="Short description shown on cards" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.nav_visible} onChange={(e) => setForm((f) => ({ ...f, nav_visible: e.target.checked }))} />
              Show in storefront nav
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={busy}>
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? 'Save Changes' : 'Add Category'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
