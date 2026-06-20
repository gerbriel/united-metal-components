export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { STAFF_ROLES } from '@/types/database'
import PurchaseOrderForm from '@/components/shared/PurchaseOrderForm'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'New Purchase Order — Dashboard' }

export default async function NewPurchaseOrderPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = (profile as any)?.role ?? ''
  if (!STAFF_ROLES.includes(role) || role === 'warehouse_employee') redirect('/dashboard')

  const { data: vendors } = await supabase.from('vendors').select('*').eq('active', true).order('name')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">New Purchase Order</h1>
        <p className="text-sm text-muted-foreground">Create a PO for materials from a vendor</p>
      </div>
      <PurchaseOrderForm vendors={(vendors ?? []) as any} />
    </div>
  )
}
