'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Phone, Mail, MapPin, Loader2 } from 'lucide-react'
import { contactSchema } from '@/lib/validate'
import { sanitizeText, sanitizeEmail, sanitizePhone } from '@/lib/sanitize'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '', subscribe: true })
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  // Signed-in visitors: prefill name/email/phone from their profile so they
  // don't retype it (only fills fields they haven't already touched).
  useEffect(() => {
    let active = true
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('full_name, first_name, last_name, email, phone')
        .eq('id', user.id)
        .single()
      if (!active || !data) return
      const p = data as { full_name?: string | null; first_name?: string | null; last_name?: string | null; email?: string | null; phone?: string | null }
      const name = p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || ''
      setForm((f) => ({
        ...f,
        name:  f.name  || name,
        email: f.email || p.email || user.email || '',
        phone: f.phone || p.phone || '',
      }))
    })
    return () => { active = false }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const result = contactSchema.safeParse(form)
    if (!result.success) {
      toast.error(result.error.issues[0].message)
      return
    }

    const clean = {
      name:    sanitizeText(form.name, 100),
      email:   sanitizeEmail(form.email),
      phone:   sanitizePhone(form.phone),
      message: sanitizeText(form.message, 5000),
    }

    setLoading(true)

    // Store the message for staff. A SECURITY DEFINER trigger matches it to an
    // existing customer (by email/phone) and notifies every office employee +
    // admin — so this single anonymous insert drives the whole staff pipeline.
    const { error } = await supabase.from('contact_messages').insert({
      name:       clean.name,
      email:      clean.email,
      phone:      clean.phone || null,
      message:    clean.message,
      subscribed: form.subscribe,
    })
    if (error) {
      toast.error('Something went wrong sending your message. Please call us or try again.')
      setLoading(false)
      return
    }

    if (form.subscribe && clean.email) {
      await supabase
        .from('newsletter_subscribers')
        .upsert({ email: clean.email, name: clean.name, status: 'active' }, { onConflict: 'email' })
    }
    toast.success("Message received! We'll be in touch within 1 business day.")
    setForm({ name: '', email: '', phone: '', message: '', subscribe: false })
    setLoading(false)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <h1 className="text-3xl font-bold mb-2">Contact Us</h1>
      <p className="text-muted-foreground mb-10">Get a quote or ask about our products — we respond within 1 business day.</p>

      <div className="grid lg:grid-cols-2 gap-10">
        <Card>
          <CardHeader><CardTitle>Send a Message</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <Label>Your Name *</Label>
                  <Input value={form.name} onChange={set('name')} required />
                </div>
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <Label>Email *</Label>
                  <Input type="email" value={form.email} onChange={set('email')} required />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Phone *</Label>
                  <Input type="tel" value={form.phone} onChange={set('phone')} required />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Message *</Label>
                  <Textarea value={form.message} onChange={set('message')} rows={5} required placeholder="Tell us what you need..." />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.subscribe} onChange={(e) => setForm((f) => ({ ...f, subscribe: e.target.checked }))} className="rounded" />
                Subscribe to product updates & deals
              </label>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Send Message
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">Get In Touch</h2>
            <div className="space-y-4">
              {[
                [Phone, 'Phone', '(559) 567-9118', 'tel:+15595679118'],
                [Mail, 'Email', 'sales@unitedmetalcomponents.com', 'mailto:sales@unitedmetalcomponents.com'],
                [MapPin, 'Location', 'Your City, State ZIP', null],
              ].map(([Icon, label, value, href]: any) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    {href ? <a href={href} className="font-medium hover:text-primary transition-colors">{value}</a>
                      : <p className="font-medium">{value}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-lg">
            <h3 className="font-semibold mb-2">Business Hours</h3>
            <div className="text-sm space-y-1 text-muted-foreground">
              <div className="flex justify-between"><span>Monday – Friday</span><span>7:00 AM – 5:00 PM</span></div>
              <div className="flex justify-between"><span>Saturday</span><span>8:00 AM – 12:00 PM</span></div>
              <div className="flex justify-between"><span>Sunday</span><span>Closed</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
