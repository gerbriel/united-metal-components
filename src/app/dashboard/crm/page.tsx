export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import CRMCustomerList from '@/components/shared/CRMCustomerList'
import ActiveCartsList, { type ActiveCart } from '@/components/shared/ActiveCartsList'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { isAdminRole } from '@/types/database'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'CRM — Dashboard' }

export default async function CRMPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: viewer } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  const isAdmin = isAdminRole((viewer as any)?.role ?? '')

  let customersQuery = supabase
    .from('profiles')
    .select('id, full_name, company_name, phone, created_at, pricing_tier, orders(id, total, status)')
    .eq('role', 'customer')
    .order('created_at', { ascending: false })

  if (!isAdmin) {
    // Non-admins cannot see contractor_tax_exempt_tbd customers
    customersQuery = customersQuery.or('pricing_tier.is.null,pricing_tier.neq.contractor_tax_exempt_tbd')
  }

  const [{ data: customers }, { data: carts }] = await Promise.all([
    customersQuery,
    // Active carts (staff-readable via RLS) — what shoppers currently have queued.
    supabase
      .from('carts')
      .select('session_id, user_id, item_count, items, updated_at, profiles(full_name, company_name)')
      .gt('item_count', 0)
      .order('updated_at', { ascending: false })
      .limit(50),
  ])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">CRM — Customers</h1>
        <p className="text-sm text-muted-foreground">{customers?.length ?? 0} customers</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active Carts</CardTitle>
          <p className="text-xs text-muted-foreground">Shoppers with items in their cart — reach out or send a reminder.</p>
        </CardHeader>
        <CardContent className="p-0">
          <ActiveCartsList carts={(carts ?? []) as unknown as ActiveCart[]} />
        </CardContent>
      </Card>

      <CRMCustomerList customers={(customers ?? []) as any} isAdmin={isAdmin} />
    </div>
  )
}
