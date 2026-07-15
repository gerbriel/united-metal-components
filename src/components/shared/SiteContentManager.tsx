'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Loader2, Plus, Trash2, Save, Clock, CalendarDays, FileText } from 'lucide-react'
import RichTextEditor from '@/components/shared/RichTextEditor'
import type { BusinessHours, HoursRow, Holiday } from '@/lib/site-content'

export default function SiteContentManager({
  initialHours, initialPrivacy, initialTerms,
}: { initialHours: BusinessHours; initialPrivacy: string; initialTerms: string }) {
  const supabase = createClient()
  const [rows, setRows] = useState<HoursRow[]>(initialHours.rows.length ? initialHours.rows : [{ label: '', hours: '' }])
  const [holidays, setHolidays] = useState<Holiday[]>(initialHours.holidays)
  const [privacy, setPrivacy] = useState(initialPrivacy)
  const [terms, setTerms] = useState(initialTerms)
  const [saving, setSaving] = useState<string | null>(null)

  const setRow = (i: number, patch: Partial<HoursRow>) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const addRow = () => setRows((rs) => [...rs, { label: '', hours: '' }])
  const delRow = (i: number) => setRows((rs) => rs.filter((_, idx) => idx !== i))

  const setHol = (i: number, patch: Partial<Holiday>) => setHolidays((hs) => hs.map((h, idx) => (idx === i ? { ...h, ...patch } : h)))
  const addHol = () => setHolidays((hs) => [...hs, { date: '', label: '', closed: true, hours: '' }])
  const delHol = (i: number) => setHolidays((hs) => hs.filter((_, idx) => idx !== i))

  const save = async (key: string, value: unknown, section: string) => {
    setSaving(section)
    const { error } = await supabase.from('site_content').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    if (error) toast.error(`Failed to save ${section}`)
    else toast.success(`${section} saved`)
    setSaving(null)
  }
  const saveHours = () => save('business_hours', {
    rows: rows.filter((r) => r.label.trim() || r.hours.trim()),
    holidays: holidays.filter((h) => h.date).map((h) => ({ ...h, hours: h.closed ? null : (h.hours || null) })),
  }, 'Hours')
  const savePrivacy = () => save('privacy_policy', { html: privacy }, 'Privacy Policy')
  const saveTerms = () => save('terms_of_service', { html: terms }, 'Terms of Service')

  return (
    <div className="space-y-8">
      {/* ── Business hours ─────────────────────────────── */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold">Business Hours</h2>
        </div>
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input value={r.label} onChange={(e) => setRow(i, { label: e.target.value })} placeholder="Mon – Fri" className="max-w-[220px]" />
              <Input value={r.hours} onChange={(e) => setRow(i, { hours: e.target.value })} placeholder="7am – 5pm" className="max-w-[220px]" />
              <button type="button" onClick={() => delRow(i)} className="p-1.5 text-muted-foreground hover:text-destructive" aria-label="Remove row">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addRow} className="gap-1.5"><Plus className="w-4 h-4" />Add row</Button>
        </div>

        {/* Holidays */}
        <div className="pt-2 border-t space-y-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Holiday hours</h3>
            <span className="text-xs text-muted-foreground">closed days or special hours, shown while upcoming</span>
          </div>
          {holidays.length === 0 && <p className="text-xs text-muted-foreground">No holidays set.</p>}
          {holidays.map((h, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <Input type="date" value={h.date} onChange={(e) => setHol(i, { date: e.target.value })} className="max-w-[170px]" />
              <Input value={h.label} onChange={(e) => setHol(i, { label: e.target.value })} placeholder="Christmas Day" className="max-w-[200px]" />
              <label className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" checked={h.closed} onChange={(e) => setHol(i, { closed: e.target.checked })} />
                Closed
              </label>
              {!h.closed && (
                <Input value={h.hours ?? ''} onChange={(e) => setHol(i, { hours: e.target.value })} placeholder="9am – 1pm" className="max-w-[160px]" />
              )}
              <button type="button" onClick={() => delHol(i)} className="p-1.5 text-muted-foreground hover:text-destructive" aria-label="Remove holiday">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addHol} className="gap-1.5"><Plus className="w-4 h-4" />Add holiday</Button>
        </div>

        <Button onClick={saveHours} disabled={saving === 'Hours'} className="gap-1.5">
          {saving === 'Hours' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Save hours
        </Button>
      </Card>

      {/* ── Privacy Policy ─────────────────────────────── */}
      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold">Privacy Policy</h2>
        </div>
        <p className="text-xs text-muted-foreground">Leave blank to keep the built-in default page. Anything here overrides it.</p>
        <RichTextEditor value={privacy} onChange={setPrivacy} />
        <Button onClick={savePrivacy} disabled={saving === 'Privacy Policy'} className="gap-1.5">
          {saving === 'Privacy Policy' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Save privacy policy
        </Button>
      </Card>

      {/* ── Terms of Service ───────────────────────────── */}
      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold">Terms of Service</h2>
        </div>
        <p className="text-xs text-muted-foreground">Leave blank to keep the built-in default page. Anything here overrides it.</p>
        <RichTextEditor value={terms} onChange={setTerms} />
        <Button onClick={saveTerms} disabled={saving === 'Terms of Service'} className="gap-1.5">
          {saving === 'Terms of Service' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Save terms of service
        </Button>
      </Card>
    </div>
  )
}
