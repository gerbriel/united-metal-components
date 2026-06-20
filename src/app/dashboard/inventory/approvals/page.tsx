export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isAdminRole, STAFF_ROLES } from '@/types/database'
import InventoryApprovals from '@/components/shared/InventoryApprovals'
import InventoryNav from '@/components/shared/InventoryNav'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Inventory Approvals — Dashboard' }

export default async function ApprovalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = (profile as any)?.role ?? ''
  if (!STAFF_ROLES.includes(role)) redirect('/')
  if (!isAdminRole(role)) redirect('/dashboard/inventory')

  const { data: entries } = await supabase
    .from('inventory_entries')
    .select(`
      *,
      products(name, sku),
      product_coils(coil_identifier, color),
      tube_bundles(bundle_identifier, gauge),
      submitter:submitted_by(full_name)
    `)
    .order('submitted_at', { ascending: false })
    .limit(100)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Inventory</h1>
        <p className="text-sm text-muted-foreground">Approve or reject employee inventory updates</p>
      </div>

      <InventoryNav active="approvals" />

      <InventoryApprovals initialEntries={(entries ?? []) as any} />
    </div>
  )
}
