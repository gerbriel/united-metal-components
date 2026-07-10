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

  const [{ data: customers }, { data: products }, rates] = await Promise.all([
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
    fetchTaxRates(supabase),
  ])

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
      />
    </div>
  )
}
