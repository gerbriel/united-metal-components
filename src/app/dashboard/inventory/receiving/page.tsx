export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isAdminRole, isOfficeRole, STAFF_ROLES } from '@/types/database'
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
  // Office + admin manage receiving; other staff need the can_receive_inventory flag.
  const canReceive = isAdmin || isOfficeRole(role) || (STAFF_ROLES.includes(role) && !!(profile as any)?.can_receive_inventory)

  if (!canReceive) redirect('/dashboard/inventory')

  const [
    { data: tubeProducts },
    { data: astmCodes },
    { data: vendors },
    { data: openPos },
    { data: standardProducts },
    { data: openPoItems },
  ] = await Promise.all([
    supabase
      .from('products')
      .select('id, name')
      .eq('product_type', 'tube')
      .eq('active', true)
      .order('name'),
    supabase
      .from('astm_codes')
      .select('id, code, description, category, is_favorite, sort_order')
      .eq('archived', false)
      .order('sort_order', { ascending: true })
      .order('code', { ascending: true }),
    supabase.from('vendors').select('id, name').eq('active', true).order('name'),
    supabase
      .from('purchase_orders')
      .select('id, po_number, vendor_id, status, order_date, purchase_order_items(color)')
      .in('status', ['draft', 'submitted', 'partial'])
      .order('order_date', { ascending: false }),
    // Standard catalog products that can be received into stock.
    supabase
      .from('products')
      .select('id, name, sku, unit')
      .eq('product_type', 'standard')
      .eq('active', true)
      .order('name'),
    // Open PO lines tied to a product — used to auto-credit the right line on receipt.
    supabase
      .from('purchase_order_items')
      .select('id, po_id, product_id, description, quantity, quantity_received, purchase_orders!inner(po_number, status)')
      .not('product_id', 'is', null)
      .in('purchase_orders.status', ['draft', 'submitted', 'partial']),
  ])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Inventory</h1>
        <p className="text-sm text-muted-foreground">Log incoming materials — coils, tube bundles</p>
      </div>

      <InventoryNav active="receiving" />

      <ReceivingManager
        tubeProducts={(tubeProducts ?? []) as any}
        astmCodes={(astmCodes ?? []) as any}
        vendors={(vendors ?? []) as any}
        openPos={(openPos ?? []) as any}
        standardProducts={(standardProducts ?? []) as any}
        openPoItems={(openPoItems ?? []) as any}
      />
    </div>
  )
}
