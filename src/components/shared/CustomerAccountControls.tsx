'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Pricing tiers mirror the admin user manager / CRM label map. '__unassigned__'
// clears the tier (no pricing on file yet). Prices are never shown on the
// storefront regardless — the tier drives internal/quoted pricing only.
const TIER_OPTIONS: { value: string; label: string }[] = [
  { value: '__unassigned__',            label: 'Unassigned' },
  { value: 'retail',                    label: 'Retail' },
  { value: 'retail_tax_exempt',         label: 'Retail (Tax Exempt)' },
  { value: 'contractor',                label: 'Contractor' },
  { value: 'contractor_tax_exempt_tbd', label: 'Contractor (Tax Exempt - Pending)' },
  { value: 'contractor_tax_exempt',     label: 'Contractor (Tax Exempt)' },
]

interface Props {
  userId: string
  customerType: 'retail' | 'contractor' | null
  pricingTier: string | null
}

export default function CustomerAccountControls({ userId, customerType, pricingTier }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [type, setType] = useState<string>(customerType ?? '__unassigned__')
  const [tier, setTier] = useState<string>(pricingTier ?? '__unassigned__')
  const [saving, setSaving] = useState(false)

  const save = async (patch: { customer_type?: string; pricing_tier?: string }) => {
    setSaving(true)
    const { error } = await supabase.rpc('staff_update_customer_type', {
      p_user_id:       userId,
      p_customer_type: patch.customer_type ?? null,
      p_pricing_tier:  patch.pricing_tier ?? null,
    })
    setSaving(false)
    if (error) { toast.error('Update failed'); return }
    toast.success('Account updated')
    router.refresh()
  }

  const onTypeChange = (v: string | null) => {
    if (!v) return
    setType(v)
    save({ customer_type: v === '__unassigned__' ? '__clear__' : v })
  }

  const onTierChange = (v: string | null) => {
    if (!v) return
    setTier(v)
    save({ pricing_tier: v === '__unassigned__' ? '__clear__' : v })
  }

  return (
    <>
      <div>
        <dt className="text-xs text-muted-foreground mb-1">Account Type</dt>
        <dd>
          <Select value={type} onValueChange={onTypeChange} disabled={saving}>
            <SelectTrigger className="h-8 w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__unassigned__">—</SelectItem>
              <SelectItem value="retail">One-off Customer</SelectItem>
              <SelectItem value="contractor">Contractor</SelectItem>
            </SelectContent>
          </Select>
        </dd>
      </div>

      <div>
        <dt className="text-xs text-muted-foreground mb-1">Pricing Tier</dt>
        <dd>
          <Select value={tier} onValueChange={onTierChange} disabled={saving}>
            <SelectTrigger className="h-8 w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIER_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </dd>
      </div>
    </>
  )
}
