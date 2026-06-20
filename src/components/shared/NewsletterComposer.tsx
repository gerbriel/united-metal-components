'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, CheckSquare, Square, Users } from 'lucide-react'

interface Subscriber {
  id: number
  email: string
  name: string | null
}

interface Props {
  subscribers: Subscriber[]
}

export default function NewsletterComposer({ subscribers }: Props) {
  const [form, setForm]           = useState({ subject: '', preview_text: '', body_html: '' })
  const [selectedIds, setSelected] = useState<Set<number>>(new Set(subscribers.map((s) => s.id)))
  const [loading, setLoading]     = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const toggleAll = () => {
    if (selectedIds.size === subscribers.length) setSelected(new Set())
    else setSelected(new Set(subscribers.map((s) => s.id)))
  }

  const toggleOne = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const handleSave = async (status: 'draft' | 'sent') => {
    if (!form.subject || !form.body_html) { toast.error('Subject and body are required'); return }
    if (status === 'sent' && selectedIds.size === 0) { toast.error('Select at least one recipient'); return }
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    const { data: campaign, error } = await supabase
      .from('newsletter_campaigns')
      .insert({
        subject:      form.subject,
        preview_text: form.preview_text || null,
        body_html:    form.body_html,
        body_text:    form.body_html.replace(/<[^>]+>/g, ''),
        status,
        sent_at:     status === 'sent' ? new Date().toISOString() : null,
        created_by:  user?.id ?? null,
      })
      .select()
      .single()

    if (error || !campaign) { toast.error('Failed to save campaign'); setLoading(false); return }

    // Record recipients when sending
    if (status === 'sent' && selectedIds.size > 0) {
      const chosen = subscribers.filter((s) => selectedIds.has(s.id))
      await supabase.from('newsletter_campaign_recipients').insert(
        chosen.map((s) => ({
          campaign_id:   (campaign as any).id,
          subscriber_id: s.id,
          email:         s.email,
          name:          s.name,
        }))
      )
    }

    toast.success(status === 'draft' ? 'Draft saved' : `Campaign sent to ${selectedIds.size} subscriber(s)`)
    setForm({ subject: '', preview_text: '', body_html: '' })
    setSelected(new Set(subscribers.map((s) => s.id)))
    router.refresh()
    setLoading(false)
  }

  const allSelected = selectedIds.size === subscribers.length

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="space-y-1.5">
            <Label>Subject Line *</Label>
            <Input value={form.subject} onChange={set('subject')} placeholder="e.g. New Products In Stock — Pricing Update" />
          </div>
          <div className="space-y-1.5">
            <Label>Preview Text</Label>
            <Input value={form.preview_text} onChange={set('preview_text')} placeholder="Short preview shown in email clients" />
          </div>
          <div className="space-y-1.5">
            <Label>Email Body (HTML or plain text) *</Label>
            <Textarea
              value={form.body_html}
              onChange={set('body_html')}
              rows={10}
              placeholder="<h1>Hello!</h1><p>We have updated pricing on select products...</p>"
              className="font-mono text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Recipient selector */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold text-sm">
                Recipients — {selectedIds.size} of {subscribers.length} selected
              </span>
            </div>
            <button
              onClick={toggleAll}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
          </div>

          {subscribers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No active subscribers yet.</p>
          ) : (
            <div className="border rounded-xl divide-y max-h-64 overflow-y-auto">
              {subscribers.map((s) => {
                const checked = selectedIds.has(s.id)
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleOne(s.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${checked ? 'bg-primary/5' : 'hover:bg-slate-50'}`}
                  >
                    {checked
                      ? <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                      : <Square className="w-4 h-4 text-muted-foreground shrink-0" />
                    }
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{s.email}</p>
                      {s.name && <p className="text-xs text-muted-foreground">{s.name}</p>}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => handleSave('draft')} disabled={loading}>
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save Draft
        </Button>
        <Button
          onClick={() => handleSave('sent')}
          disabled={loading || selectedIds.size === 0}
          className="bg-orange-500 hover:bg-orange-600 text-white border-0"
        >
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Send to {selectedIds.size} Subscriber{selectedIds.size !== 1 ? 's' : ''}
        </Button>
      </div>
    </div>
  )
}
