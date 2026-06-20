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
  first_name:         string
  last_name:          string
  phone:              string
  mailing_address:    string
  business_address:   string
  company_name:       string
  contractor_license: string
  reseller_license:   string
}

type AccountInfo = {
  email:         string
  customer_type: 'retail' | 'contractor' | null
  pricing_tier:  string | null
}

const PRICING_TIER_LABEL: Record<string, string> = {
  retail:                    'Retail',
  retail_tax_exempt:         'Retail (Tax Exempt)',
  contractor:                'Contractor',
  contractor_tax_exempt_tbd: 'Contractor (Tax Exempt - Pending)',
  contractor_tax_exempt:     'Contractor (Tax Exempt)',
}

const EMPTY: FormState = {
  first_name: '', last_name: '', phone: '',
  mailing_address: '', business_address: '',
  company_name: '', contractor_license: '', reseller_license: '',
}

export default function SettingsPage() {
  const [form,    setForm]    = useState<FormState>(EMPTY)
  const [account, setAccount] = useState<AccountInfo>({ email: '', customer_type: null, pricing_tier: null })
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        const d = data as any
        setForm({
          first_name:         d.first_name         ?? '',
          last_name:          d.last_name          ?? '',
          phone:              d.phone              ?? '',
          mailing_address:    d.mailing_address    ?? '',
          business_address:   d.business_address   ?? '',
          company_name:       d.company_name       ?? d.company ?? '',
          contractor_license: d.contractor_license ?? '',
          reseller_license:   d.reseller_license   ?? '',
        })
        setAccount({
          email:         d.email         ?? user.email ?? '',
          customer_type: d.customer_type ?? null,
          pricing_tier:  d.pricing_tier  ?? null,
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
      first_name:         form.first_name.trim()         || null,
      last_name:          form.last_name.trim()          || null,
      full_name:          `${form.first_name} ${form.last_name}`.trim() || null,
      phone:              form.phone.trim()              || null,
      mailing_address:    form.mailing_address.trim()   || null,
      business_address:   form.business_address.trim()  || null,
      company_name:       form.company_name.trim()       || null,
      contractor_license: form.contractor_license.trim() || null,
      reseller_license:   form.reseller_license.trim()   || null,
    }).eq('id', user.id)

    if (error) { toast.error('Failed to update profile'); setLoading(false); return }
    toast.success('Profile updated')
    setLoading(false)
  }

  const isContractor = account.customer_type === 'contractor'
  // Show business section if they're a contractor OR already have any business data
  const showBusinessSection =
    isContractor ||
    form.company_name ||
    form.contractor_license ||
    form.reseller_license ||
    form.business_address

  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-2xl font-bold">Account Settings</h1>

      {/* Account type */}
      <Card>
        <CardHeader><CardTitle className="text-base">Account Type</CardTitle></CardHeader>
        <CardContent className="flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: isContractor ? '#fed7aa' : '#bfdbfe' }}
          >
            {isContractor
              ? <HardHat className="w-5 h-5 text-orange-700" />
              : <Home className="w-5 h-5 text-blue-700" />}
          </div>
          <div>
            <p className="font-semibold text-sm">
              {isContractor
                ? 'Contractor / Business'
                : account.customer_type === 'retail'
                ? 'Homeowner / Retail'
                : 'Customer'}
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
          {account.email && (
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={account.email} readOnly disabled className="bg-slate-50 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Email cannot be changed here — contact support.</p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>First Name</Label>
              <Input value={form.first_name} onChange={set('first_name')} placeholder="John" />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name</Label>
              <Input value={form.last_name} onChange={set('last_name')} placeholder="Smith" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input type="tel" value={form.phone} onChange={set('phone')} placeholder="(559) 000-0000" />
          </div>
          <div className="space-y-1.5">
            <Label>Mailing Address</Label>
            <Input value={form.mailing_address} onChange={set('mailing_address')} placeholder="123 Main St, Fresno, CA 93701" />
          </div>
        </CardContent>
      </Card>

      {/* Business info — shown for contractors or anyone with existing business data */}
      {showBusinessSection && (
        <Card>
          <CardHeader><CardTitle className="text-base">Business Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Company Name</Label>
              <Input value={form.company_name} onChange={set('company_name')} placeholder="Smith Construction LLC" />
            </div>
            <div className="space-y-1.5">
              <Label>Business Address</Label>
              <Input value={form.business_address} onChange={set('business_address')} placeholder="456 Commerce Ave, Fresno, CA 93702" />
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
