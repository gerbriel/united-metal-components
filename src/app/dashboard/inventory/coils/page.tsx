export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isAdminRole, isWarehouseRole, STAFF_ROLES } from '@/types/database'
import CoilManager from '@/components/shared/CoilManager'
import InventoryNav from '@/components/shared/InventoryNav'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Coil Inventory — Dashboard' }

export default async function CoilsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, employee_role')
    .eq('id', user.id)
    .single()

  const role    = (profile as any)?.role ?? ''
  const empRole = (profile as any)?.employee_role ?? null
  if (!STAFF_ROLES.includes(role)) redirect('/')

  const isAdmin     = isAdminRole(role)
  const isWarehouse = isWarehouseRole(role, empRole)

  const { data: coils } = await supabase
    .from('product_coils')
    .select('*')
    .order('received_at', { ascending: false })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Inventory</h1>
        <p className="text-sm text-muted-foreground">Coil stock — panels, hat channel/brace, and tube coils</p>
      </div>

      <InventoryNav active="coils" />

      <CoilManager
        initialCoils={(coils ?? []) as any}
        isAdmin={isAdmin}
      />
    </div>
  )
}
