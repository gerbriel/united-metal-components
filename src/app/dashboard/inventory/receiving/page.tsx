export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isAdminRole, STAFF_ROLES } from '@/types/database'
import ReceivingManager from '@/components/shared/ReceivingManager'
import InventoryNav from '@/components/shared/InventoryNav'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Material Receiving — Dashboard' }

export default async function ReceivingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, employee_role, can_receive_inventory')
    .eq('id', user.id)
    .single()

  const role    = (profile as any)?.role ?? ''
  const isAdmin = isAdminRole(role)
  const canReceive = isAdmin || (STAFF_ROLES.includes(role) && !!(profile as any)?.can_receive_inventory)

  if (!canReceive) redirect('/dashboard/inventory')

  const { data: tubeProducts } = await supabase
    .from('products')
    .select('id, name')
    .eq('product_type', 'tube')
    .eq('active', true)
    .order('name')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Inventory</h1>
        <p className="text-sm text-muted-foreground">Log incoming materials — coils, tube bundles</p>
      </div>

      <InventoryNav active="receiving" />

      <ReceivingManager tubeProducts={(tubeProducts ?? []) as any} />
    </div>
  )
}
