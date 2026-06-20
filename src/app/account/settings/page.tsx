'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, HardHat, Home } from 'lucide-react'

type FormState = {
  first_name: string
  last_name: string
  phone: string
  company_name: string
  contractor_license: string
  reseller_license: string
}

type AccountInfo = {
  customer_type: 'retail' | 'contractor' | null
  pricing_tier: string | null
}

const PRICING_TIER_LABEL: Record<string, string> = {
  retail:                     'Retail',
  retail_tax_exempt:          'Retail (Tax Exempt)',
  contractor:                 'Contractor',
  contractor_tax_exempt_tbd:  'Contractor (Tax Exempt - Pending)',
  contractor_tax_exempt:      'Contractor (Tax Exempt)',
}

const EMPTY: FormState = {
  first_name: '', last_name: '', phone: '',
  company_name: '', contractor_license: '', reseller_license: '',
}

export default function SettingsPage() {
  const [form, setForm]       = useState<FormState>(EMPTY)
  const [account, setAccount] = useState<AccountInfo>({ customer_type: null, pricing_tier: null })
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setForm({
          first_name:         (data as any).first_name         ?? '',
          last_name:          (data as any).last_name          ?? '',
          phone:              (data as any).phone              ?? '',
          company_name:       (data as any).company_name       ?? (data as any).company ?? '',
          contractor_license: (data as any).contractor_license ?? '',
          reseller_license:   (data as any).reseller_license   ?? '',
        })
        setAccount({
          customer_type: (data as any).customer_type ?? null,
          pricing_tier:  (data as any).pricing_tier  ?? null,
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

    const patch: Record<string, string | null> = {
      first_name: form.first_name.trim() || null,
      last_name:  form.last_name.trim()  || null,
      full_name:  `${form.first_name} ${form.last_name}`.trim() || null,
      phone:      form.phone.trim()      || null,
    }

    if (account.customer_type === 'contractor') {
      patch.company_name       = form.company_name.trim()       || null
      patch.contractor_license = form.contractor_license.trim() || null
      patch.reseller_license   = form.reseller_license.trim()   || null
    }

    const { error } = await supabase.from('profiles').update(patch).eq('id', user.id)
    if (error) { toast.error('Failed to update profile'); setLoading(false); return }
    toast.success('Profile updated')
    setLoading(false)
  }

  const isContractor = account.customer_type === 'contractor'

  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-2xl font-bold">Account Settings</h1>

      {/* Account type badge */}
      <Card>
        <CardHeader><CardTitle className="text-base">Account Type</CardTitle></CardHeader>
        <CardContent className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: isContractor ? '#fed7aa' : '#bfdbfe' }}>
            {isContractor
              ? <HardHat className="w-5 h-5 text-orange-700" />
              : <Home className="w-5 h-5 text-blue-700" />}
          </div>
          <div>
            <p className="font-semibold text-sm">
              {isContractor ? 'Contractor / Business' : account.customer_type === 'retail' ? 'Homeowner / Retail' : 'Account'}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">Pricing tier:</span>
              {account.pricing_tier ? (
                <Badge variant="secondary" className="text-xs">
                  {PRICING_TIER_LABEL[account.pricing_tier] ?? account.pricing_tier}
                </Badge>
              ) : (
                <span className="text-xs text-muted-foreground italic">Pending review — contact us for pricing</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal info */}
      <Card>
        <CardHeader><CardTitle className="text-base">Personal Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>First Name</Label>
              <Input value={form.first_name} onChange={set('first_name')} placeholder="John" />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name</Label>
              <Input value={form.last_name} onChange={set('last_name')} placeholder="Smith" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input type="tel" value={form.phone} onChange={set('phone')} placeholder="(559) 000-0000" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business info — contractors only */}
      {isContractor && (
        <Card>
          <CardHeader><CardTitle className="text-base">Business Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Company Name</Label>
              <Input value={form.company_name} onChange={set('company_name')} placeholder="Smith Construction LLC" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Contractor License #</Label>
                <Input value={form.contractor_license} onChange={set('contractor_license')} placeholder="CA license number" />
              </div>
              <div className="space-y-1.5">
                <Label>Reseller License #</Label>
                <Input value={form.reseller_license} onChange={set('reseller_license')} placeholder="Resale certificate #" />
                <p className="text-xs text-muted-foreground">Required for tax-exempt pricing</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Button onClick={handleSave} disabled={loading} className="bg-orange-500 hover:bg-orange-600 text-white border-0">
        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Save Changes
      </Button>
    </div>
  )
}
