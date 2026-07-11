export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isStaffRole, isWarehouseRole } from '@/types/database'
import OrderBuilder from '@/components/shared/OrderBuilder'
import { fetchTaxRates } from '@/lib/tax'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'New Order — Dashboard' }

export default async function NewOrderPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = (profile as { role?: string } | null)?.role ?? ''
  if (!isStaffRole(role) || isWarehouseRole(role)) redirect('/dashboard/orders')

  const [{ data: customers }, { data: products }, { data: tierRows }, rates] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, company_name, email, phone, pricing_tier')
      .eq('role', 'customer')
      .order('full_name'),
    supabase
      .from('products')
      .select('id, name, sku, price, unit')
      .eq('active', true)
      .order('name'),
    supabase.from('product_tier_prices').select('product_id, tier_key, price').in('tier_key', ['contractor', 'retail']),
    fetchTaxRates(supabase),
  ])

  // productId → { contractor?, retail? } so each order line can default to the
  // customer's tier price (see OrderBuilder.defaultUnitFor).
  const tierPrices: Record<number, { contractor?: number; retail?: number }> = {}
  for (const r of (tierRows ?? []) as { product_id: number; tier_key: string; price: number | string }[]) {
    const e = (tierPrices[r.product_id] ??= {})
    if (r.tier_key === 'contractor') e.contractor = Number(r.price)
    else if (r.tier_key === 'retail') e.retail = Number(r.price)
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">New Order</h1>
        <p className="text-sm text-muted-foreground">Create an order on behalf of a customer.</p>
      </div>
      <OrderBuilder
        customers={(customers ?? []) as never}
        products={(products ?? []) as never}
        rates={rates}
        tierPrices={tierPrices}
      />
    </div>
  )
}
