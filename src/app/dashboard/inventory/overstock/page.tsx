export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isAdminRole, STAFF_ROLES } from '@/types/database'
import OverstockManager from '@/components/shared/OverstockManager'
import InventoryNav from '@/components/shared/InventoryNav'
import { OVERSTOCK_SKUS } from '@/lib/product-config'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Overstock Panels — Dashboard' }

export default async function OverstockPage() {
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
    { data: rows },
    { data: overstockProducts },
    { data: panelCoils },
    { data: vendors },
    { data: openPos },
  ] = await Promise.all([
    supabase
      .from('panel_overstock')
      .select('*, products(name), product_coils(coil_identifier, color)')
      .order('received_at', { ascending: false }),
    // The catalog product(s) overstock panels are sold under (e.g. the 29 GA
    // "Overstock" SKU). New listings attach to the first one.
    supabase
      .from('products')
      .select('id, name, sku')
      .in('sku', [...OVERSTOCK_SKUS])
      .order('name'),
    // Panel coils, for the optional source-coil (traceability) picker.
    supabase
      .from('product_coils')
      .select('id, coil_identifier, color')
      .eq('coil_category', 'panel')
      .eq('status', 'active')
      .eq('archived', false)
      .order('received_at', { ascending: false }),
    supabase.from('vendors').select('id, name').eq('active', true).order('name'),
    supabase
      .from('purchase_orders')
      .select('id, po_number, vendor_id, status')
      .in('status', ['draft', 'submitted', 'partial'])
      .order('order_date', { ascending: false }),
  ])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Inventory</h1>
        <p className="text-sm text-muted-foreground">Overstock panels — pre-made pieces by color, length, and quantity</p>
      </div>

      <InventoryNav active="overstock" />

      <OverstockManager
        initialRows={(rows ?? []) as any}
        overstockProducts={(overstockProducts ?? []) as any}
        panelCoils={(panelCoils ?? []) as any}
        isAdmin={isAdmin}
        vendors={(vendors ?? []) as any}
        openPos={(openPos ?? []) as any}
      />
    </div>
  )
}
