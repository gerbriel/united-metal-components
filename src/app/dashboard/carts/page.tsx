export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import RealtimeRefresh from '@/components/shared/RealtimeRefresh'
import ActiveCartsList, { type ActiveCart } from '@/components/shared/ActiveCartsList'
import { isStaffRole, isWarehouseRole } from '@/types/database'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Carts — Dashboard' }

export default async function CartsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = (profile as { role?: string } | null)?.role ?? ''
  if (!isStaffRole(role) || isWarehouseRole(role)) redirect('/dashboard')

  // Active carts (item_count > 0), staff-readable via RLS. Guests have a null
  // user_id and show as "Guest"; signed-in shoppers link to their CRM record.
  const { data: carts } = await supabase
    .from('carts')
    .select('session_id, user_id, item_count, items, updated_at, profiles(full_name, company_name)')
    .gt('item_count', 0)
    .order('updated_at', { ascending: false })
    .limit(100)

  const list = (carts ?? []) as unknown as ActiveCart[]

  return (
    <div className="space-y-5">
      <RealtimeRefresh />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Active Carts</h1>
          <p className="text-sm text-muted-foreground">Shoppers with items in their cart — reach out or send a reminder from their CRM record.</p>
        </div>
        <p className="text-sm text-muted-foreground">{list.length} cart{list.length === 1 ? '' : 's'}</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <ActiveCartsList carts={list} />
        </CardContent>
      </Card>
    </div>
  )
}
