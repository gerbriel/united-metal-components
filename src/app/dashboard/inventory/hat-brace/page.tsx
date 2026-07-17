export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isAdminRole, isOfficeRole, STAFF_ROLES } from '@/types/database'
import HatBraceStockManager from '@/components/shared/HatBraceStockManager'
import InventoryNav from '@/components/shared/InventoryNav'
import { HAT_BRACE_SKUS } from '@/lib/product-config'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Hat/Brace Stock — Dashboard' }

export default async function HatBraceStockPage() {
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
    { data: hatBraceProducts },
    { data: coils },
  ] = await Promise.all([
    supabase
      .from('hat_brace_stock')
      .select('*, products(name, sku), product_coils(coil_identifier)')
      .order('updated_at', { ascending: false }),
    // The catalog hat/brace products (HAT_BRACE_SKUS). New rows attach to one of
    // these. Match SKU case-insensitively (ilike, no wildcards) since it's
    // admin-editable.
    supabase
      .from('products')
      .select('id, name, sku')
      .or([...HAT_BRACE_SKUS].map((s) => `sku.ilike.${s}`).join(','))
      .eq('active', true)
      .order('name'),
    // The shared hat_channel_brace coil pool these pieces are cut from, for the
    // optional source-coil picker.
    supabase
      .from('product_coils')
      .select('id, coil_identifier')
      .eq('coil_category', 'hat_channel_brace')
      .eq('status', 'active')
      .eq('archived', false)
      .order('coil_identifier'),
  ])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Inventory</h1>
        <p className="text-sm text-muted-foreground">Hat/brace stock — pre-cut hat-channel and brace pieces on hand by length</p>
      </div>

      <InventoryNav active="hat-brace" />

      <HatBraceStockManager
        initialRows={(rows ?? []) as any}
        hatBraceProducts={(hatBraceProducts ?? []) as any}
        coils={(coils ?? []) as any}
        isAdmin={isAdmin}
        isOffice={isOffice}
      />
    </div>
  )
}
