export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isAdminRole, isOfficeRole, STAFF_ROLES } from '@/types/database'
import AstmLibraryManager from '@/components/shared/AstmLibraryManager'
import InventoryNav from '@/components/shared/InventoryNav'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'ASTM Library — Dashboard' }

export default async function AstmPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = (profile as any)?.role ?? ''
  if (!STAFF_ROLES.includes(role)) redirect('/')
  const isAdmin = isAdminRole(role)
  const isOffice = isOfficeRole(role)

  const { data: codes } = await supabase
    .from('astm_codes')
    .select('*')
    .order('is_favorite', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('code', { ascending: true })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Inventory</h1>
        <p className="text-sm text-muted-foreground">
          ASTM code library — favorite the specs you use so they auto-fill when receiving coils
        </p>
      </div>

      <InventoryNav active="astm" />

      <AstmLibraryManager initialCodes={(codes ?? []) as any} isAdmin={isAdmin} isOffice={isOffice} />
    </div>
  )
}
