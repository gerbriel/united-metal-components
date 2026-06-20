export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isAdminRole, STAFF_ROLES } from '@/types/database'
import VendorManager from '@/components/shared/VendorManager'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Vendors — Dashboard' }

export default async function VendorsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = (profile as any)?.role ?? ''
  if (!STAFF_ROLES.includes(role)) redirect('/')

  const isAdmin = isAdminRole(role)
  // Warehouse employees can't manage vendors
  if (!isAdmin && role === 'warehouse_employee') redirect('/dashboard')

  const { data: vendors } = await supabase
    .from('vendors')
    .select('*')
    .order('name')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Vendors</h1>
        <p className="text-sm text-muted-foreground">Manage supplier contacts and view purchase orders by vendor</p>
      </div>
      <VendorManager initialVendors={(vendors ?? []) as any} />
    </div>
  )
}
