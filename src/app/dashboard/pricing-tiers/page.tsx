export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isAdminRole, isStaffRole } from '@/types/database'
import PricingTierManager, { type PricingTierRow } from '@/components/shared/PricingTierManager'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Pricing Tiers — Dashboard' }

export default async function PricingTiersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = (profile as { role?: string } | null)?.role ?? ''
  if (!isStaffRole(role)) redirect('/')
  if (!isAdminRole(role)) redirect('/dashboard')

  const [{ data: tiers }, { data: profiles }] = await Promise.all([
    supabase.from('pricing_tiers').select('*').order('sort_order').order('label'),
    supabase.from('profiles').select('pricing_tier'),
  ])

  // How many customers are on each tier — drives the "reassign first" delete guard.
  const counts = new Map<string, number>()
  for (const p of profiles ?? []) {
    const t = (p as { pricing_tier: string | null }).pricing_tier
    if (t) counts.set(t, (counts.get(t) ?? 0) + 1)
  }
  const rows: PricingTierRow[] = (tiers ?? []).map(
    (t: Omit<PricingTierRow, 'usageCount'>) => ({ ...t, usageCount: counts.get(t.key) ?? 0 }),
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Pricing Tiers</h1>
        <p className="text-sm text-muted-foreground">
          The tiers customers can be assigned. Each belongs to an account type — retail customers only get
          retail tiers, contractors only contractor tiers.
        </p>
      </div>
      <PricingTierManager initial={rows} />
    </div>
  )
}
