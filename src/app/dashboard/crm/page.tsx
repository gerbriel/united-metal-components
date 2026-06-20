export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import CRMCustomerList from '@/components/shared/CRMCustomerList'
import { isAdminRole } from '@/types/database'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'CRM — Dashboard' }

export default async function CRMPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: viewer } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  const isAdmin = isAdminRole((viewer as any)?.role ?? '')

  const { data: customers } = await supabase
    .from('profiles')
    .select('id, full_name, company_name, phone, created_at, orders(id, total, status)')
    .eq('role', 'customer')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">CRM — Customers</h1>
        <p className="text-sm text-muted-foreground">{customers?.length ?? 0} customers</p>
      </div>
      <CRMCustomerList customers={(customers ?? []) as any} isAdmin={isAdmin} />
    </div>
  )
}
