'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Loader2, Plus, Trash2, Save, Clock, CalendarDays, FileText } from 'lucide-react'
import RichTextEditor from '@/components/shared/RichTextEditor'
import { holidayFromPreset, upcomingFederalHolidays, resolveHolidayDate, type BusinessHours, type HoursRow, type Holiday } from '@/lib/site-content'
import { DEFAULT_PRIVACY_HTML, DEFAULT_TERMS_HTML } from '@/lib/legal-defaults'

const pad2 = (n: number) => String(n).padStart(2, '0')
const fmtMonthDay = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

export default function SiteContentManager({
  initialHours, initialPrivacy, initialTerms,
}: { initialHours: BusinessHours; initialPrivacy: string; initialTerms: string }) {
  const supabase = createClient()
  const [rows, setRows] = useState<HoursRow[]>(initialHours.rows.length ? initialHours.rows : [{ label: '', hours: '' }])
  const [holidays, setHolidays] = useState<Holiday[]>(initialHours.holidays)
  // Prefill the editors with the current content so admins edit from what's live
  // (the public pages keep their built-in default until an override is saved).
  const [privacy, setPrivacy] = useState(initialPrivacy || DEFAULT_PRIVACY_HTML)
  const [terms, setTerms] = useState(initialTerms || DEFAULT_TERMS_HTML)
  const [saving, setSaving] = useState<string | null>(null)

  const setRow = (i: number, patch: Partial<HoursRow>) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const addRow = () => setRows((rs) => [...rs, { label: '', hours: '' }])
  const delRow = (i: number) => setRows((rs) => rs.filter((_, idx) => idx !== i))

  const setHol = (i: number, patch: Partial<Holiday>) => setHolidays((hs) => hs.map((h, idx) => (idx === i ? { ...h, ...patch } : h)))
  const addHol = (h: Holiday = { label: '', closed: true, date: '' }) => setHolidays((hs) => [...hs, h])
  const delHol = (i: number) => setHolidays((hs) => hs.filter((_, idx) => idx !== i))

  const todayIso = new Date().toISOString().slice(0, 10)
  const curYear = Number(todayIso.slice(0, 4))
  // Nearest-upcoming federal holidays only (not the whole list) for quick-add.
  const nextFederal = upcomingFederalHolidays(todayIso, 4)
  const isFloating = (h: Holiday) => h.weekday != null && h.nth != null
  // Date-input value: the one-time date, or a fixed-recurring month/day against
  // the current year so it's editable.
  const dateVal = (h: Holiday) => h.date ?? (h.month && h.day ? `${curYear}-${pad2(h.month)}-${pad2(h.day)}` : '')
  // Next occurrence for a recurring holiday (this year, or next if already past).
  const resolveNext = (h: Holiday) => {
    let on = resolveHolidayDate(h, curYear)
    if (on && on < todayIso) on = resolveHolidayDate(h, curYear + 1)
    return on ?? todayIso
  }

  const save = async (key: string, value: unknown, section: string) => {
    setSaving(section)
    const { error } = await supabase.from('site_content').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    if (error) toast.error(`Failed to save ${section}`)
    else toast.success(`${section} saved`)
    setSaving(null)
  }
  const saveHours = () => save('business_hours', {
    rows: rows.filter((r) => r.label.trim() || r.hours.trim()),
    holidays: holidays
      .filter((h) => h.label?.trim() && (h.recurring ? (h.day || h.weekday != null || h.date) : h.date))
      .map((h) => {
        const base = { label: h.label.trim(), closed: h.closed, hours: h.closed ? null : (h.hours || null) }
        // Floating recurring (e.g. Thanksgiving) — keep the nth-weekday rule.
        if (h.recurring && h.weekday != null && h.nth != null) return { ...base, recurring: true, month: h.month, weekday: h.weekday, nth: h.nth }
        // Fixed recurring — month/day from the (possibly edited) date.
        if (h.recurring) {
          const [, m, d] = (h.date || dateVal(h)).split('-')
          return { ...base, recurring: true, month: Number(m), day: Number(d) }
        }
        return { ...base, date: h.date }
      }),
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

          {/* Quick-add: only the nearest upcoming federal holidays */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Quick add:</span>
            {nextFederal.map((p) => {
              const already = holidays.some((h) => h.recurring && h.label === p.label)
              return (
                <button
                  key={p.key}
                  type="button"
                  disabled={already}
                  onClick={() => addHol(holidayFromPreset(p))}
                  className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs hover:border-primary hover:text-primary disabled:opacity-40 disabled:hover:border-border disabled:hover:text-muted-foreground"
                >
                  <Plus className="w-3 h-3" />{p.label}
                  <span className="text-muted-foreground">· {fmtMonthDay(p.on)}</span>
                </button>
              )
            })}
          </div>

          {holidays.length === 0 && <p className="text-xs text-muted-foreground">No holidays set.</p>}
          {holidays.map((h, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              {isFloating(h) ? (
                <span className="inline-flex items-center rounded-md border bg-slate-50 px-2 py-1.5 text-xs text-muted-foreground max-w-[170px]" title="Repeats yearly (nth weekday)">
                  Yearly · {fmtMonthDay(resolveNext(h))}
                </span>
              ) : (
                <Input type="date" value={dateVal(h)} onChange={(e) => setHol(i, { date: e.target.value })} className="max-w-[170px]" />
              )}
              <Input value={h.label} onChange={(e) => setHol(i, { label: e.target.value })} placeholder="Christmas Day" className="max-w-[190px]" />
              {!isFloating(h) && (
                <label className="flex items-center gap-1.5 text-xs" title="Repeat every year on this date">
                  <input type="checkbox" checked={!!h.recurring} onChange={(e) => setHol(i, { recurring: e.target.checked })} />
                  Yearly
                </label>
              )}
              <label className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" checked={h.closed} onChange={(e) => setHol(i, { closed: e.target.checked })} />
                Closed
              </label>
              {!h.closed && (
                <Input value={h.hours ?? ''} onChange={(e) => setHol(i, { hours: e.target.value })} placeholder="9am – 1pm" className="max-w-[150px]" />
              )}
              <button type="button" onClick={() => delHol(i)} className="p-1.5 text-muted-foreground hover:text-destructive" aria-label="Remove holiday">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => addHol()} className="gap-1.5"><Plus className="w-4 h-4" />Add custom holiday</Button>
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
        <p className="text-xs text-muted-foreground">Prefilled with the current page. Edit and save to publish your version; clear it entirely to fall back to the built-in default.</p>
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
        <p className="text-xs text-muted-foreground">Prefilled with the current page. Edit and save to publish your version; clear it entirely to fall back to the built-in default.</p>
        <RichTextEditor value={terms} onChange={setTerms} />
        <Button onClick={saveTerms} disabled={saving === 'Terms of Service'} className="gap-1.5">
          {saving === 'Terms of Service' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Save terms of service
        </Button>
      </Card>
    </div>
  )
}
