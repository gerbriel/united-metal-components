export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isAdminRole, isOfficeRole, STAFF_ROLES } from '@/types/database'
import TrimStockManager from '@/components/shared/TrimStockManager'
import InventoryNav from '@/components/shared/InventoryNav'
import { TRIM_SKUS } from '@/lib/product-config'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Trim Stock — Dashboard' }

export default async function TrimStockPage() {
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
  const isOffice = isOfficeRole(role)

  const [
    { data: rows },
    { data: trimProducts },
    { data: finishes },
  ] = await Promise.all([
    supabase
      .from('trim_stock')
      .select('*, products(name, sku), finishes(name, hex)')
      .order('updated_at', { ascending: false }),
    // The catalog trim products (TRIM_SKUS). New rows attach to one of these.
    // Match SKU case-insensitively (ilike, no wildcards) since it's admin-editable.
    supabase
      .from('products')
      .select('id, name, sku')
      .or([...TRIM_SKUS].map((s) => `sku.ilike.${s}`).join(','))
      .eq('active', true)
      .order('name'),
    // Full palette (with ids) for the finish_id picker.
    supabase
      .from('finishes')
      .select('id, name, hex, gradient, texture')
      .eq('active', true)
      .order('sort'),
  ])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Inventory</h1>
        <p className="text-sm text-muted-foreground">Trim stock — pre-cut flashing and cap pieces on hand by color</p>
      </div>

      <InventoryNav active="trim" />

      <TrimStockManager
        initialRows={(rows ?? []) as any}
        trimProducts={(trimProducts ?? []) as any}
        finishes={(finishes ?? []) as any}
        isAdmin={isAdmin}
        isOffice={isOffice}
      />
    </div>
  )
}
