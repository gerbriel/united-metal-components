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
import { Loader2 } from 'lucide-react'

export default function NewsletterComposer() {
  const [form, setForm] = useState({ subject: '', preview_text: '', body_html: '' })
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSave = async (status: 'draft' | 'sent') => {
    if (!form.subject || !form.body_html) { toast.error('Subject and body are required'); return }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('newsletter_campaigns').insert({
      subject: form.subject,
      preview_text: form.preview_text || null,
      body_html: form.body_html,
      body_text: form.body_html.replace(/<[^>]+>/g, ''),
      status,
      sent_at: status === 'sent' ? new Date().toISOString() : null,
      created_by: user?.id ?? null,
    })
    if (error) { toast.error('Failed to save campaign'); setLoading(false); return }
    toast.success(status === 'draft' ? 'Draft saved' : 'Campaign marked as sent')
    setForm({ subject: '', preview_text: '', body_html: '' })
    router.refresh()
    setLoading(false)
  }

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="space-y-1.5">
          <Label>Subject Line *</Label>
          <Input value={form.subject} onChange={set('subject')} placeholder="e.g. New Products In Stock — Summer Sale" />
        </div>
        <div className="space-y-1.5">
          <Label>Preview Text</Label>
          <Input value={form.preview_text} onChange={set('preview_text')} placeholder="Short preview shown in email clients" />
        </div>
        <div className="space-y-1.5">
          <Label>Email Body (HTML or plain text) *</Label>
          <Textarea value={form.body_html} onChange={set('body_html')} rows={10}
            placeholder="<h1>Hello!</h1><p>We have new products in stock...</p>" className="font-mono text-sm" />
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => handleSave('draft')} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save Draft
          </Button>
          <Button onClick={() => handleSave('sent')} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Mark as Sent
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
