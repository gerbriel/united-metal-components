'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

type FormState = {
  first_name: string
  last_name: string
  phone: string
  company_name: string
  mailing_address: string
  business_address: string
}

const EMPTY: FormState = {
  first_name: '', last_name: '', phone: '',
  company_name: '', mailing_address: '', business_address: '',
}

export default function SettingsPage() {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setForm({
          first_name:       (data as any).first_name       ?? '',
          last_name:        (data as any).last_name        ?? '',
          phone:            (data as any).phone            ?? '',
          company_name:     (data as any).company_name     ?? (data as any).company ?? '',
          mailing_address:  (data as any).mailing_address  ?? '',
          business_address: (data as any).business_address ?? '',
        })
      }
    })
  }, [])

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('profiles').update({
      first_name:       form.first_name.trim()       || null,
      last_name:        form.last_name.trim()        || null,
      full_name:        `${form.first_name} ${form.last_name}`.trim() || null,
      phone:            form.phone.trim()            || null,
      company_name:     form.company_name.trim()     || null,
      mailing_address:  form.mailing_address.trim()  || null,
      business_address: form.business_address.trim() || null,
    }).eq('id', user.id)

    if (error) { toast.error('Failed to update profile'); setLoading(false); return }
    toast.success('Profile updated')
    setLoading(false)
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-2xl font-bold">Account Settings</h1>

      {/* Personal */}
      <Card>
        <CardHeader><CardTitle className="text-base">Personal Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>First Name *</Label>
              <Input value={form.first_name} onChange={set('first_name')} placeholder="John" required />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name *</Label>
              <Input value={form.last_name} onChange={set('last_name')} placeholder="Smith" required />
            </div>
            <div className="space-y-1.5">
              <Label>Phone *</Label>
              <Input type="tel" value={form.phone} onChange={set('phone')} placeholder="(559) 000-0000" required />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business */}
      <Card>
        <CardHeader><CardTitle className="text-base">Business Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Company Name *</Label>
            <Input value={form.company_name} onChange={set('company_name')} placeholder="Smith Construction LLC" required />
          </div>
          <div className="space-y-1.5">
            <Label>Mailing Address *</Label>
            <Input value={form.mailing_address} onChange={set('mailing_address')} placeholder="PO Box or street — where you receive mail" required />
          </div>
          <div className="space-y-1.5">
            <Label>Business Address *</Label>
            <Input value={form.business_address} onChange={set('business_address')} placeholder="Physical location of your business" required />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={loading} className="bg-orange-500 hover:bg-orange-600 text-white border-0">
        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Save Changes
      </Button>
    </div>
  )
}
