export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isAdminRole, STAFF_ROLES } from '@/types/database'
import TubeManager from '@/components/shared/TubeManager'
import InventoryNav from '@/components/shared/InventoryNav'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Tube Inventory — Dashboard' }

export default async function TubesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, employee_role')
    .eq('id', user.id)
    .single()

  const role = (profile as any)?.role ?? ''
  if (!STAFF_ROLES.includes(role)) redirect('/')
  const isAdmin = isAdminRole(role)

  const [
    { data: specs },
    { data: bundles },
    { data: tubeProducts },
  ] = await Promise.all([
    supabase
      .from('tube_specs')
      .select('*, products(name)')
      .order('product_id'),
    supabase
      .from('tube_bundles')
      .select('*, products(name), product_coils(coil_identifier)')
      .order('received_at', { ascending: false }),
    supabase
      .from('products')
      .select('id, name')
      .eq('product_type', 'tube')
      .eq('active', true)
      .order('name'),
  ])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Inventory</h1>
        <p className="text-sm text-muted-foreground">Tube bundles — 12 and 14 gauge in standardized lengths</p>
      </div>

      <InventoryNav active="tubes" />

      <TubeManager
        initialSpecs={(specs ?? []) as any}
        initialBundles={(bundles ?? []) as any}
        tubeProducts={(tubeProducts ?? []) as any}
        isAdmin={isAdmin}
      />
    </div>
  )
}
