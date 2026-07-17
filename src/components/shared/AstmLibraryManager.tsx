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
import { Plus, Loader2, Star, Pencil, Archive, ArchiveRestore, Trash2 } from 'lucide-react'
import { submitInventoryRequest } from '@/lib/inventory/requests'

export interface AstmRow {
  id: number
  code: string
  description: string | null
  category: 'panel' | 'hat_channel_brace' | 'tube' | null
  is_favorite: boolean
  sort_order: number
  archived: boolean
  created_at: string
}

const CATEGORY_LABELS: Record<string, string> = {
  panel:             'Panel',
  hat_channel_brace: 'Hat Channel / Brace',
  tube:              'Tube',
}

const EMPTY_FORM = {
  code: '',
  description: '',
  category: '__any__',
  is_favorite: false,
  sort_order: '0',
}

interface Props {
  initialCodes: AstmRow[]
  isAdmin: boolean
  // Office employees add/edit/archive/favorite ASTM codes, but changes go to the
  // approval queue instead of writing astm_codes directly.
  isOffice?: boolean
}

export default function AstmLibraryManager({ initialCodes, isAdmin, isOffice = false }: Props) {
  const [codes, setCodes]     = useState<AstmRow[]>(initialCodes)
  const [showArchived, setShowArchived] = useState(false)
  const [dialogOpen, setDialogOpen]     = useState(false)
  const [editingId, setEditingId]       = useState<number | null>(null)
  const [form, setForm]                 = useState(EMPTY_FORM)
  const [saving, setSaving]             = useState(false)
  const [busyId, setBusyId]             = useState<number | null>(null)
  const supabase = createClient()

  const fetchCodes = useCallback(async () => {
    const { data } = await supabase
      .from('astm_codes')
      .select('*')
      .order('is_favorite', { ascending: false })
      .order('sort_order', { ascending: true })
      .order('code', { ascending: true })
    if (data) setCodes(data as AstmRow[])
  }, [])

  useEffect(() => {
    const ch = supabase
      .channel('astm-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'astm_codes' }, fetchCodes)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchCodes])

  const openAdd = () => { setEditingId(null); setForm(EMPTY_FORM); setDialogOpen(true) }
  const openEdit = (c: AstmRow) => {
    setEditingId(c.id)
    setForm({
      code: c.code,
      description: c.description ?? '',
      category: c.category ?? '__any__',
      is_favorite: c.is_favorite,
      sort_order: c.sort_order.toString(),
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.code.trim()) { toast.error('Code is required'); return }
    setSaving(true)
    const payload = {
      code: form.code.trim(),
      description: form.description.trim() || null,
      category: form.category === '__any__' ? null : form.category,
      is_favorite: form.is_favorite,
      sort_order: parseInt(form.sort_order) || 0,
    }
    if (isOffice && !isAdmin) {
      const { error } = await submitInventoryRequest(supabase, {
        targetTable: 'astm_codes',
        operation: editingId ? 'update' : 'create',
        targetId: editingId ?? null,
        payload,
        summary: `${editingId ? 'Edit' : 'Add'} ASTM code ${payload.code}`,
      })
      if (error) { toast.error(error.message); setSaving(false); return }
      toast.success('Submitted for admin approval')
      setDialogOpen(false)
      setForm(EMPTY_FORM)
      setSaving(false)
      return
    }
    const { error } = editingId
      ? await supabase.from('astm_codes').update(payload).eq('id', editingId)
      : await supabase.from('astm_codes').insert(payload)
    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success(editingId ? 'ASTM code updated' : 'ASTM code added')
    setDialogOpen(false)
    setForm(EMPTY_FORM)
    await fetchCodes()
    setSaving(false)
  }

  const toggleFavorite = async (c: AstmRow) => {
    setBusyId(c.id)
    if (isOffice && !isAdmin) {
      const { error } = await submitInventoryRequest(supabase, {
        targetTable: 'astm_codes',
        operation: 'update',
        targetId: c.id,
        payload: { is_favorite: !c.is_favorite },
        summary: `${c.is_favorite ? 'Unfavorite' : 'Favorite'} ASTM code ${c.code}`,
      })
      if (error) toast.error(error.message)
      else toast.success('Submitted for admin approval')
      setBusyId(null)
      return
    }
    const { error } = await supabase.from('astm_codes').update({ is_favorite: !c.is_favorite }).eq('id', c.id)
    if (error) toast.error(error.message)
    else await fetchCodes()
    setBusyId(null)
  }

  const setArchived = async (c: AstmRow, archived: boolean) => {
    setBusyId(c.id)
    if (isOffice && !isAdmin) {
      const { error } = await submitInventoryRequest(supabase, {
        targetTable: 'astm_codes',
        operation: archived ? 'archive' : 'restore',
        targetId: c.id,
        summary: `${archived ? 'Archive' : 'Restore'} ASTM code ${c.code}`,
      })
      if (error) toast.error(error.message)
      else toast.success('Submitted for admin approval')
      setBusyId(null)
      return
    }
    const { error } = await supabase.from('astm_codes').update({ archived }).eq('id', c.id)
    if (error) toast.error(error.message)
    else { toast.success(archived ? 'Archived' : 'Restored'); await fetchCodes() }
    setBusyId(null)
  }

  const hardDelete = async (c: AstmRow) => {
    if (!confirm(`Permanently delete ASTM code "${c.code}"? This cannot be undone.`)) return
    setBusyId(c.id)
    const { error } = await supabase.from('astm_codes').delete().eq('id', c.id)
    if (error) toast.error(error.message)
    else { toast.success('Deleted'); await fetchCodes() }
    setBusyId(null)
  }

  const displayed = codes.filter((c) => showArchived || !c.archived)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Show archived
        </label>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/80 transition-colors"
            >
              <Plus className="w-4 h-4" />Add ASTM Code
            </button>
          } />
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editingId ? 'Edit ASTM Code' : 'Add ASTM Code'}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-2">
              <div className="col-span-2 space-y-1.5">
                <Label>Code *</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="e.g. A792 AZ50"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. Galvalume sheet (55% Al-Zn coated)"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => v && setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__any__">Any</SelectItem>
                    <SelectItem value="panel">Panel</SelectItem>
                    <SelectItem value="hat_channel_brace">Hat Channel / Brace</SelectItem>
                    <SelectItem value="tube">Tube</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
                />
              </div>
              <label className="col-span-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_favorite}
                  onChange={(e) => setForm((f) => ({ ...f, is_favorite: e.target.checked }))}
                />
                Favorite — show as a quick-pick when receiving
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{editingId ? 'Save' : 'Add'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <p className="text-xs text-muted-foreground">{displayed.length} code{displayed.length !== 1 ? 's' : ''}</p>

      <div className="border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-muted-foreground border-b">
              <tr>
                <th className="text-left p-3">Code</th>
                <th className="text-left p-3">Description</th>
                <th className="text-left p-3">Category</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {displayed.length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-muted-foreground text-sm">No ASTM codes</td></tr>
              )}
              {displayed.map((c) => {
                const busy = busyId === c.id
                return (
                  <tr key={c.id} className={`${c.archived ? 'opacity-50' : ''} bg-white hover:bg-slate-50 transition-colors`}>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleFavorite(c)}
                          disabled={busy}
                          title={c.is_favorite ? 'Unfavorite' : 'Favorite'}
                          className="shrink-0"
                        >
                          <Star className={`w-4 h-4 ${c.is_favorite ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
                        </button>
                        <span className="font-mono font-semibold">{c.code}</span>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">{c.description ?? '—'}</td>
                    <td className="p-3">
                      {c.category
                        ? <Badge className="border text-xs bg-slate-100 text-slate-700">{CATEGORY_LABELS[c.category]}</Badge>
                        : <span className="text-xs text-muted-foreground">Any</span>}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEdit(c)}>
                          <Pencil className="w-3 h-3 mr-1" />Edit
                        </Button>
                        {c.archived ? (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setArchived(c, false)} disabled={busy}>
                            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <><ArchiveRestore className="w-3 h-3 mr-1" />Restore</>}
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setArchived(c, true)} disabled={busy}>
                            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Archive className="w-3 h-3 mr-1" />Archive</>}
                          </Button>
                        )}
                        {isAdmin && (
                          <Button
                            size="sm" variant="outline"
                            className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => hardDelete(c)}
                            disabled={busy}
                          >
                            <Trash2 className="w-3 h-3 mr-1" />Delete
                          </Button>
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
