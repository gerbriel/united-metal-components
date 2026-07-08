export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isAdminRole, isWarehouseRole, STAFF_ROLES } from '@/types/database'
import CoilManager from '@/components/shared/CoilManager'
import InventoryNav from '@/components/shared/InventoryNav'
import { OPEN_ORDER_STATUSES } from '@/lib/coilSupply'
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
  const isWarehouse = isWarehouseRole(role)

  const [{ data: coils }, { data: vendors }, { data: openPos }, { data: demandRows }] = await Promise.all([
    supabase.from('product_coils').select('*').order('received_at', { ascending: false }),
    supabase.from('vendors').select('id, name').eq('active', true).order('name'),
    supabase
      .from('purchase_orders')
      .select('id, po_number, vendor_id, status')
      .in('status', ['draft', 'submitted', 'partial'])
      .order('order_date', { ascending: false }),
    // Panel footage committed to open (unfulfilled) orders, per color.
    supabase
      .from('order_items')
      .select('item_color, linear_feet, orders!inner(status)')
      .not('item_color', 'is', null)
      .not('linear_feet', 'is', null)
      .in('orders.status', OPEN_ORDER_STATUSES as unknown as string[]),
  ])

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
        vendors={(vendors ?? []) as any}
        openPos={(openPos ?? []) as any}
        demand={(demandRows ?? []) as any}
      />
    </div>
  )
}
