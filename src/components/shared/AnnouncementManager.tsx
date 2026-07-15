'use client'

import { useState, type ChangeEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Plus, Pencil, Trash2, Loader2, Play, Pause, ImagePlus, X, Link2, Target, BarChart3, Clock, Eye, MousePointerClick,
} from 'lucide-react'
import type { AnnouncementStatus } from '@/lib/announcements'
import type {
  Announcement, Database,
  AnnouncementFormat, AnnouncementBgStyle, AnnouncementTargetMode,
  AnnouncementAudience, AnnouncementFrequency, AnnouncementTrigger,
} from '@/types/database'

type AnnInsert = Database['public']['Tables']['announcements']['Insert']

export interface AnnouncementRow extends Announcement {
  status: AnnouncementStatus
  impressions: number
  clicks: number
  dismisses: number
}

// ── Option metadata ───────────────────────────────────────────
const FORMAT_META: { value: AnnouncementFormat; label: string; hint: string }[] = [
  { value: 'bar',    label: 'Bar',         hint: 'Slim top strip' },
  { value: 'hero',   label: 'Hero banner', hint: 'Image + button' },
  { value: 'modal',  label: 'Modal',       hint: 'Center popup' },
  { value: 'corner', label: 'Corner card', hint: 'Bottom corner' },
  { value: 'bottom', label: 'Bottom bar',  hint: 'Sticky bar' },
]
const BG_META: { value: AnnouncementBgStyle; label: string; swatch: string }[] = [
  { value: 'navy',   label: 'Navy',   swatch: '#1E3A63' },
  { value: 'orange', label: 'Orange', swatch: '#EC6A2B' },
  { value: 'green',  label: 'Green',  swatch: '#2E7D53' },
  { value: 'red',    label: 'Red',    swatch: '#B23B3B' },
  { value: 'dark',   label: 'Dark',   swatch: '#0E1B30' },
]
const AUDIENCE_LABEL: Record<AnnouncementAudience, string> = {
  everyone: 'Everyone', anon: 'Logged-out visitors only', auth: 'Signed-in users only',
}
const FREQUENCY_LABEL: Record<AnnouncementFrequency, string> = {
  always: 'Every page load', session: 'Once per visit', daily: 'Once per day', once: 'Once ever',
}
const TRIGGER_LABEL: Record<AnnouncementTrigger, string> = {
  load: 'Immediately', delay: 'After a delay', exit: 'On exit intent',
}
const STATUS_BADGE: Record<AnnouncementStatus, string> = {
  live:      'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
  scheduled: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  ended:     'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  paused:    'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
}
const STATUS_LABEL: Record<AnnouncementStatus, string> = {
  live: 'Live', scheduled: 'Scheduled', ended: 'Ended', paused: 'Paused',
}
const IMAGE_FORMATS: AnnouncementFormat[] = ['hero', 'modal', 'corner']
const COLOR_FORMATS: AnnouncementFormat[] = ['bar', 'bottom']

// ── datetime-local <-> ISO ────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, '0')
function isoToLocal(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function localToIso(s: string): string | null {
  if (!s) return null
  const t = new Date(s).getTime()
  return Number.isNaN(t) ? null : new Date(t).toISOString()
}

// A collision-resistant object path for an uploaded image. Kept at module scope
// so the timestamp/random bits aren't analyzed as render-time impurity.
function uploadPath(fileName: string): string {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`
}

interface Form {
  format: AnnouncementFormat
  title: string; body: string; image_path: string
  cta_label: string; cta_url: string
  bg_style: AnnouncementBgStyle
  target_mode: AnnouncementTargetMode; target_paths: string[]
  audience: AnnouncementAudience
  frequency: AnnouncementFrequency
  trigger: AnnouncementTrigger; delay_seconds: number
  dismissible: boolean; priority: number
  utm_source: string; utm_medium: string; utm_campaign: string; utm_content: string; utm_term: string
  starts_at: string; ends_at: string
  active: boolean
}

const EMPTY: Form = {
  format: 'bar', title: '', body: '', image_path: '', cta_label: '', cta_url: '',
  bg_style: 'navy', target_mode: 'all', target_paths: [], audience: 'everyone',
  frequency: 'always', trigger: 'load', delay_seconds: 3, dismissible: true, priority: 0,
  utm_source: '', utm_medium: '', utm_campaign: '', utm_content: '', utm_term: '',
  starts_at: '', ends_at: '', active: true,
}

function fromRow(a: AnnouncementRow): Form {
  const u = a.utm ?? {}
  return {
    format: a.format, title: a.title ?? '', body: a.body ?? '', image_path: a.image_path ?? '',
    cta_label: a.cta_label ?? '', cta_url: a.cta_url ?? '', bg_style: a.bg_style,
    target_mode: a.target_mode, target_paths: a.target_paths ?? [], audience: a.audience,
    frequency: a.frequency, trigger: a.trigger, delay_seconds: a.delay_seconds ?? 3,
    dismissible: a.dismissible, priority: a.priority ?? 0,
    utm_source: u.source ?? '', utm_medium: u.medium ?? '', utm_campaign: u.campaign ?? '',
    utm_content: u.content ?? '', utm_term: u.term ?? '',
    starts_at: isoToLocal(a.starts_at), ends_at: isoToLocal(a.ends_at), active: a.active,
  }
}

function FormatGlyph({ format }: { format: AnnouncementFormat }) {
  const common = { width: 26, height: 18, viewBox: '0 0 26 18', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6 }
  switch (format) {
    case 'bar':    return <svg {...common}><rect x="1" y="2" width="24" height="4" rx="1.5" fill="currentColor" opacity=".18" /><rect x="1" y="2" width="24" height="4" rx="1.5" /></svg>
    case 'hero':   return <svg {...common}><rect x="1" y="5" width="24" height="8" rx="1.5" fill="currentColor" opacity=".18" /><rect x="1" y="5" width="24" height="8" rx="1.5" /><rect x="3" y="7" width="7" height="4" rx="1" fill="currentColor" opacity=".5" /></svg>
    case 'modal':  return <svg {...common}><rect x="7" y="2" width="12" height="14" rx="1.5" fill="currentColor" opacity=".18" /><rect x="7" y="2" width="12" height="14" rx="1.5" /></svg>
    case 'corner': return <svg {...common}><rect x="14" y="9" width="11" height="8" rx="1.5" fill="currentColor" opacity=".18" /><rect x="14" y="9" width="11" height="8" rx="1.5" /></svg>
    case 'bottom': return <svg {...common}><rect x="1" y="12" width="24" height="4" rx="1.5" fill="currentColor" opacity=".18" /><rect x="1" y="12" width="24" height="4" rx="1.5" /></svg>
  }
}

const ctr = (clicks: number, impressions: number) => (impressions > 0 ? `${((clicks / impressions) * 100).toFixed(1)}%` : '—')

function windowText(a: Announcement): string {
  const fmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  if (a.starts_at && a.ends_at) return `${fmt(a.starts_at)} – ${fmt(a.ends_at)}`
  if (a.starts_at) return `From ${fmt(a.starts_at)}`
  if (a.ends_at) return `Until ${fmt(a.ends_at)}`
  return 'No end date'
}

export default function AnnouncementManager({ initial }: { initial: AnnouncementRow[] }) {
  const [rows, setRows] = useState<AnnouncementRow[]>(initial)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AnnouncementRow | null>(null)
  const [form, setForm] = useState<Form>(EMPTY)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [pathInput, setPathInput] = useState('')
  const supabase = createClient()
  const router = useRouter()

  // Resync when the server sends fresh data (render-time, no effect).
  const [prevInitial, setPrevInitial] = useState(initial)
  if (initial !== prevInitial) { setPrevInitial(initial); setRows(initial) }

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }))

  const openAdd = () => { setEditing(null); setForm(EMPTY); setPathInput(''); setDialogOpen(true) }
  const openEdit = (a: AnnouncementRow) => { setEditing(a); setForm(fromRow(a)); setPathInput(''); setDialogOpen(true) }

  const imagePreview = (path: string) =>
    path ? supabase.storage.from('announcements').getPublicUrl(path).data.publicUrl : null

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image file'); return }
    setUploading(true)
    const path = uploadPath(file.name)
    const { error } = await supabase.storage.from('announcements').upload(path, file, { upsert: false })
    if (error) { toast.error(`Upload failed: ${error.message}`); setUploading(false); return }
    // Drop a previously uploaded (unsaved) image so we don't orphan it.
    if (form.image_path) await supabase.storage.from('announcements').remove([form.image_path])
    set('image_path', path)
    setUploading(false)
    toast.success('Image uploaded')
  }
  const clearImage = async () => {
    const path = form.image_path
    set('image_path', '')
    if (path && (!editing || editing.image_path !== path)) {
      await supabase.storage.from('announcements').remove([path])
    }
  }

  const addPath = () => {
    const p = pathInput.trim()
    if (!p) return
    if (!form.target_paths.includes(p)) set('target_paths', [...form.target_paths, p])
    setPathInput('')
  }
  const removePath = (p: string) => set('target_paths', form.target_paths.filter((x) => x !== p))

  const buildPayload = (): AnnInsert => {
    const utm: Record<string, string> = {}
    if (form.utm_source.trim())   utm.source = form.utm_source.trim()
    if (form.utm_medium.trim())   utm.medium = form.utm_medium.trim()
    if (form.utm_campaign.trim()) utm.campaign = form.utm_campaign.trim()
    if (form.utm_content.trim())  utm.content = form.utm_content.trim()
    if (form.utm_term.trim())     utm.term = form.utm_term.trim()
    return {
      format: form.format,
      title: form.title.trim() || null,
      body: form.body.trim() || null,
      image_path: IMAGE_FORMATS.includes(form.format) ? (form.image_path || null) : null,
      cta_label: form.cta_label.trim() || null,
      cta_url: form.cta_url.trim() || null,
      bg_style: form.bg_style,
      target_mode: form.target_mode,
      target_paths: form.target_mode === 'all' ? [] : form.target_paths,
      audience: form.audience,
      frequency: form.frequency,
      trigger: form.trigger,
      delay_seconds: form.trigger === 'delay' ? Math.max(0, Math.round(form.delay_seconds) || 0) : 0,
      dismissible: form.dismissible,
      priority: Math.round(form.priority) || 0,
      utm,
      starts_at: localToIso(form.starts_at),
      ends_at: localToIso(form.ends_at),
      active: form.active,
    }
  }

  const handleSave = async () => {
    const needsText = COLOR_FORMATS.includes(form.format)
    if (needsText && !form.title.trim()) { toast.error('A headline is required for this format'); return }
    if (!needsText && !form.title.trim() && !form.body.trim() && !form.image_path) {
      toast.error('Add a headline, body, or image'); return
    }
    if (form.starts_at && form.ends_at && new Date(form.ends_at) <= new Date(form.starts_at)) {
      toast.error('The end date must be after the start date'); return
    }
    if (form.target_mode !== 'all' && form.target_paths.length === 0) {
      toast.error('Add at least one page path, or set targeting to “Every page”'); return
    }
    setBusy(true)
    const payload = buildPayload()
    if (editing) {
      const { error } = await supabase.from('announcements')
        .update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editing.id)
      if (error) { toast.error('Failed to save announcement'); setBusy(false); return }
      toast.success('Announcement saved')
    } else {
      const { error } = await supabase.from('announcements').insert(payload)
      if (error) { toast.error('Failed to create announcement'); setBusy(false); return }
      toast.success('Announcement created')
    }
    setDialogOpen(false); setBusy(false); router.refresh()
  }

  const toggleActive = async (a: AnnouncementRow) => {
    setRows((rs) => rs.map((r) => (r.id === a.id ? { ...r, active: !r.active } : r)))
    const { error } = await supabase.from('announcements')
      .update({ active: !a.active, updated_at: new Date().toISOString() }).eq('id', a.id)
    if (error) toast.error('Failed to update')
    router.refresh()
  }

  const remove = async (a: AnnouncementRow) => {
    if (!confirm(`Delete “${a.title || 'this announcement'}”? This also removes its analytics.`)) return
    setBusy(true)
    const { error } = await supabase.from('announcements').delete().eq('id', a.id)
    if (error) { toast.error('Failed to delete'); setBusy(false); return }
    if (a.image_path) await supabase.storage.from('announcements').remove([a.image_path])
    toast.success('Announcement deleted'); setBusy(false); router.refresh()
  }

  const showImage = IMAGE_FORMATS.includes(form.format)
  const showColor = COLOR_FORMATS.includes(form.format)

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openAdd} className="gap-1.5"><Plus className="w-4 h-4" />New announcement</Button>
      </div>

      <Card className="divide-y">
        {rows.length === 0 && (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No announcements yet. Create one to show a banner or popup on the storefront.
          </p>
        )}
        {rows.map((a) => {
          const status = a.status
          return (
            <div key={a.id} className={`flex items-center gap-3 p-3 ${a.active ? '' : 'opacity-60'}`}>
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-muted text-foreground/70">
                <FormatGlyph format={a.format} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold">{a.title || <span className="text-muted-foreground italic">Untitled</span>}</p>
                  <Badge variant="secondary" className={`shrink-0 text-[10px] ${STATUS_BADGE[status]}`}>{STATUS_LABEL[status]}</Badge>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {FORMAT_META.find((f) => f.value === a.format)?.label} · {windowText(a)}
                  {a.target_mode !== 'all' && ` · ${a.target_paths.length} page${a.target_paths.length === 1 ? '' : 's'}`}
                </p>
              </div>
              <div className="hidden shrink-0 items-center gap-4 sm:flex">
                <span className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums" title="Impressions">
                  <Eye className="w-3.5 h-3.5" />{a.impressions.toLocaleString()}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums" title="Clicks">
                  <MousePointerClick className="w-3.5 h-3.5" />{a.clicks.toLocaleString()}
                </span>
                <span className="w-12 text-right text-xs font-medium tabular-nums" title="Click rate">{ctr(a.clicks, a.impressions)}</span>
              </div>
              <button onClick={() => toggleActive(a)} title={a.active ? 'Pause' : 'Resume'}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
                {a.active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button onClick={() => openEdit(a)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => remove(a)} disabled={busy}
                className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600 disabled:opacity-40 dark:hover:bg-red-950">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        })}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit announcement' : 'New announcement'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Format */}
            <section className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Format</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {FORMAT_META.map((f) => (
                  <button key={f.value} type="button" onClick={() => set('format', f.value)}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border p-2.5 text-center transition-colors ${
                      form.format === f.value ? 'border-primary bg-accent ring-1 ring-primary' : 'border-border hover:bg-muted'}`}>
                    <span className={form.format === f.value ? 'text-primary' : 'text-muted-foreground'}><FormatGlyph format={f.value} /></span>
                    <span className="text-[11px] font-semibold leading-tight">{f.label}</span>
                    <span className="text-[10px] text-muted-foreground leading-tight">{f.hint}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Content */}
            <section className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Content</Label>
              <div className="space-y-1.5">
                <Label>Headline{showColor ? ' *' : ''}</Label>
                <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Free delivery this week" />
              </div>
              <div className="space-y-1.5">
                <Label>Body text</Label>
                <Textarea value={form.body} onChange={(e) => set('body', e.target.value)} rows={2}
                  placeholder="Supporting line shown under the headline." />
              </div>
              {showImage && (
                <div className="space-y-1.5">
                  <Label>Image</Label>
                  {form.image_path ? (
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imagePreview(form.image_path) ?? ''} alt="" className="h-16 w-24 rounded-md border object-cover" />
                      <Button type="button" variant="outline" size="sm" onClick={clearImage} className="gap-1.5">
                        <X className="w-3.5 h-3.5" />Remove
                      </Button>
                    </div>
                  ) : (
                    <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                      {uploading ? 'Uploading…' : 'Upload image'}
                      <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
                    </label>
                  )}
                </div>
              )}
              {showColor && (
                <div className="space-y-1.5">
                  <Label>Background color</Label>
                  <div className="flex flex-wrap gap-2">
                    {BG_META.map((b) => (
                      <button key={b.value} type="button" onClick={() => set('bg_style', b.value)}
                        className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs ${
                          form.bg_style === b.value ? 'border-primary ring-1 ring-primary' : 'border-border'}`}>
                        <span className="h-3.5 w-3.5 rounded-full" style={{ background: b.swatch }} />{b.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5" />Button / link text</Label>
                  <Input value={form.cta_label} onChange={(e) => set('cta_label', e.target.value)} placeholder="Shop now" />
                </div>
                <div className="space-y-1.5">
                  <Label>Links to</Label>
                  <Input value={form.cta_url} onChange={(e) => set('cta_url', e.target.value)} placeholder="/products or https://…" />
                </div>
              </div>
            </section>

            {/* Schedule + behaviour */}
            <section className="space-y-3">
              <Label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />Schedule &amp; behavior
              </Label>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Starts</Label>
                  <Input type="datetime-local" value={form.starts_at} onChange={(e) => set('starts_at', e.target.value)} />
                  <p className="text-[11px] text-muted-foreground">Leave blank to start immediately.</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Ends</Label>
                  <Input type="datetime-local" value={form.ends_at} onChange={(e) => set('ends_at', e.target.value)} />
                  <p className="text-[11px] text-muted-foreground">Leave blank to run indefinitely.</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Show to each visitor</Label>
                  <Select value={form.frequency} onValueChange={(v) => v && set('frequency', v as AnnouncementFrequency)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(FREQUENCY_LABEL) as AnnouncementFrequency[]).map((k) => (
                        <SelectItem key={k} value={k}>{FREQUENCY_LABEL[k]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {(form.format === 'modal' || form.format === 'corner') && (
                  <div className="space-y-1.5">
                    <Label>Reveal</Label>
                    <Select value={form.trigger} onValueChange={(v) => v && set('trigger', v as AnnouncementTrigger)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(TRIGGER_LABEL) as AnnouncementTrigger[]).map((k) => (
                          <SelectItem key={k} value={k}>{TRIGGER_LABEL[k]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              {(form.format === 'modal' || form.format === 'corner') && form.trigger === 'delay' && (
                <div className="space-y-1.5 sm:max-w-[200px]">
                  <Label>Delay (seconds)</Label>
                  <Input type="number" min={0} value={form.delay_seconds}
                    onChange={(e) => set('delay_seconds', Number(e.target.value))} />
                </div>
              )}
            </section>

            {/* Targeting */}
            <section className="space-y-3">
              <Label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <Target className="w-3.5 h-3.5" />Where it shows
              </Label>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Pages</Label>
                  <Select value={form.target_mode} onValueChange={(v) => v && set('target_mode', v as AnnouncementTargetMode)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Every page</SelectItem>
                      <SelectItem value="include">Only specific pages</SelectItem>
                      <SelectItem value="exclude">Every page except…</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Audience</Label>
                  <Select value={form.audience} onValueChange={(v) => v && set('audience', v as AnnouncementAudience)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(AUDIENCE_LABEL) as AnnouncementAudience[]).map((k) => (
                        <SelectItem key={k} value={k}>{AUDIENCE_LABEL[k]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.target_mode !== 'all' && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input value={pathInput} onChange={(e) => setPathInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPath() } }}
                      placeholder="/carports or /products/*" />
                    <Button type="button" variant="outline" onClick={addPath}>Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {form.target_paths.map((p) => (
                      <span key={p} className="inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-1 font-mono text-xs">
                        {p}
                        <button type="button" onClick={() => removePath(p)} className="text-muted-foreground hover:text-destructive"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                    {form.target_paths.length === 0 && <p className="text-[11px] text-muted-foreground">Add page paths. End with <span className="font-mono">*</span> to match a section.</p>}
                  </div>
                </div>
              )}
            </section>

            {/* UTM */}
            <section className="space-y-3">
              <Label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <BarChart3 className="w-3.5 h-3.5" />UTM tracking
              </Label>
              <p className="text-[11px] text-muted-foreground -mt-1">Appended to the button link. Leave blank to skip UTM tagging.</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5"><Label>Source</Label><Input value={form.utm_source} onChange={(e) => set('utm_source', e.target.value)} placeholder="site" /></div>
                <div className="space-y-1.5"><Label>Medium</Label><Input value={form.utm_medium} onChange={(e) => set('utm_medium', e.target.value)} placeholder="announcement" /></div>
                <div className="space-y-1.5"><Label>Campaign</Label><Input value={form.utm_campaign} onChange={(e) => set('utm_campaign', e.target.value)} placeholder="spring_sale" /></div>
              </div>
            </section>

            {/* Options */}
            <section className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.dismissible} onChange={(e) => set('dismissible', e.target.checked)} />
                Visitors can dismiss it
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} />
                Active
              </label>
              <div className="flex items-center gap-2 text-sm">
                <Label className="whitespace-nowrap">Priority</Label>
                <Input type="number" value={form.priority} onChange={(e) => set('priority', Number(e.target.value))} className="w-20" />
                <span className="text-[11px] text-muted-foreground">higher wins its slot</span>
              </div>
            </section>
          </div>

          <div className="flex justify-end gap-2 border-t pt-3">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={busy || uploading}>
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? 'Save changes' : 'Create announcement'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
