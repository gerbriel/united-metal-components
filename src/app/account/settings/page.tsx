'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function SettingsPage() {
  const [form, setForm] = useState({ full_name: '', phone: '', company: '', address: '', city: '', state: '', zip: '' })
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) setForm({ full_name: data.full_name ?? '', phone: data.phone ?? '', company: data.company ?? '', address: data.address ?? '', city: data.city ?? '', state: data.state ?? '', zip: data.zip ?? '' })
    })
  }, [])

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('profiles').update(form).eq('id', user.id)
    if (error) { toast.error('Failed to update profile'); setLoading(false); return }
    toast.success('Profile updated')
    setLoading(false)
  }

  return (
    <div className="space-y-5 max-w-lg">
      <h1 className="text-2xl font-bold">Account Settings</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">Profile Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Full Name</Label>
              <Input value={form.full_name} onChange={set('full_name')} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input type="tel" value={form.phone} onChange={set('phone')} />
            </div>
            <div className="space-y-1.5">
              <Label>Company</Label>
              <Input value={form.company} onChange={set('company')} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Street Address</Label>
              <Input value={form.address} onChange={set('address')} />
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input value={form.city} onChange={set('city')} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>State</Label>
                <Input value={form.state} onChange={set('state')} maxLength={2} placeholder="TX" />
              </div>
              <div className="space-y-1.5">
                <Label>ZIP</Label>
                <Input value={form.zip} onChange={set('zip')} />
              </div>
            </div>
          </div>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save Changes
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
