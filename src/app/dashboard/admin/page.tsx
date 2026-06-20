export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import AdminUserManager from '@/components/shared/AdminUserManager'
import { isAdminRole } from '@/types/database'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Admin — User Management' }

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: viewer } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!isAdminRole((viewer as any)?.role ?? '')) redirect('/dashboard')

  const { data: allUsers } = await supabase
    .from('profiles')
    .select('id, full_name, first_name, last_name, company_name, phone, role, employee_role, account_status, suspended_reason, can_receive_inventory, created_at')
    .order('created_at', { ascending: false })

  const total = allUsers?.length ?? 0
  const active = allUsers?.filter((u) => (u as any).account_status !== 'suspended').length ?? 0
  const suspended = total - active

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">User Management</h1>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{total}</p>
            <p className="text-xs text-muted-foreground">Total Users</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{active}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{suspended}</p>
            <p className="text-xs text-muted-foreground">Suspended</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Users</CardTitle>
          <p className="text-xs text-muted-foreground">
            Role changes and suspensions take effect immediately. Updates sync in real time.
          </p>
        </CardHeader>
        <CardContent>
          <AdminUserManager initialUsers={(allUsers ?? []) as any} />
        </CardContent>
      </Card>
    </div>
  )
}
