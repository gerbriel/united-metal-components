export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import CartsRealtime from '@/components/shared/CartsRealtime'
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

  // Active carts (item_count > 0), staff-readable via RLS. Fetch the customer
  // names in a second query (rather than a PostgREST embed) so a relationship
  // hiccup can never blank the whole list.
  const { data: carts } = await supabase
    .from('carts')
    .select('session_id, user_id, item_count, items, stage, updated_at')
    .gt('item_count', 0)
    .order('updated_at', { ascending: false })
    .limit(100)

  const rows = (carts ?? []) as Omit<ActiveCart, 'profiles'>[]
  const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))] as string[]
  const nameById = new Map<string, { full_name: string | null; company_name: string | null }>()
  if (userIds.length) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, full_name, company_name')
      .in('id', userIds)
    for (const p of (profs ?? []) as { id: string; full_name: string | null; company_name: string | null }[]) {
      nameById.set(p.id, { full_name: p.full_name, company_name: p.company_name })
    }
  }
  const list: ActiveCart[] = rows.map((r) => ({
    ...r,
    profiles: r.user_id ? nameById.get(r.user_id) ?? null : null,
  }))

  return (
    <div className="space-y-5">
      <CartsRealtime />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Active Carts</h1>
          <p className="text-sm text-muted-foreground">Shoppers with items in their cart — <span className="text-amber-700 font-medium">Checkout</span> means they&apos;ve reached checkout. Reach out or send a reminder from their CRM record.</p>
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
