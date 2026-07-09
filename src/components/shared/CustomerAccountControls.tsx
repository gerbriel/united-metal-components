'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { AlertTriangle } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  tierLabelMap,
  tiersForType,
  tierBelongsToType,
  defaultTierForType,
  type CustomerType,
  type PricingTier,
} from '@/lib/pricing-tiers'

interface Props {
  userId: string
  customerType: CustomerType | null
  pricingTier: string | null
  tiers: PricingTier[]   // admin-managed tiers (migration 041), fetched server-side
}

export default function CustomerAccountControls({ userId, customerType, pricingTier, tiers }: Props) {
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
    if (!v || v === type) return
    setType(v)

    // Clearing the account type clears the tier too (a tier is meaningless
    // without a type).
    if (v === '__unassigned__') {
      setTier('__unassigned__')
      save({ customer_type: '__clear__', pricing_tier: '__clear__' })
      return
    }

    // Keep the tier in sync: if the current tier doesn't belong to the new
    // account type, fall back to that type's base tier so the two never drift.
    const nextType = v as CustomerType
    const currentTier = tier === '__unassigned__' ? null : tier
    if (!tierBelongsToType(tiers, currentTier, nextType)) {
      const def = defaultTierForType(tiers, nextType)
      setTier(def ?? '__unassigned__')
      save({ customer_type: v, pricing_tier: def ?? '__clear__' })
    } else {
      save({ customer_type: v })
    }
  }

  const onTierChange = (v: string | null) => {
    if (!v || v === tier) return
    setTier(v)
    save({ pricing_tier: v === '__unassigned__' ? '__clear__' : v })
  }

  const accountType = type === '__unassigned__' ? null : (type as CustomerType)
  const tierOptions = tiersForType(tiers, accountType)
  const currentTier = tier === '__unassigned__' ? null : tier
  const labelFor = tierLabelMap(tiers)
  // Legacy/mismatched data (e.g. a contractor tier left on a retail account):
  // surface it so staff can see and correct it, rather than silently blanking.
  const mismatched = !tierBelongsToType(tiers, currentTier, accountType)

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
              <SelectItem value="ag">Agricultural</SelectItem>
            </SelectContent>
          </Select>
        </dd>
      </div>

      <div>
        <dt className="text-xs text-muted-foreground mb-1">Pricing Tier</dt>
        <dd>
          <Select value={tier} onValueChange={onTierChange} disabled={saving || !accountType}>
            <SelectTrigger className="h-8 w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__unassigned__">Unassigned</SelectItem>
              {/* Show the current value even when it's out of the type's set,
                  so a mismatch is visible and fixable. */}
              {mismatched && currentTier && (
                <SelectItem value={currentTier}>
                  {labelFor[currentTier] ?? currentTier} (mismatch)
                </SelectItem>
              )}
              {tierOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!accountType ? (
            <p className="text-xs text-muted-foreground mt-1">Set an account type first.</p>
          ) : mismatched ? (
            <p className="text-xs text-amber-600 mt-1 inline-flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Tier doesn&apos;t match the account type — pick a {accountType} tier.
            </p>
          ) : null}
        </dd>
      </div>
    </>
  )
}
