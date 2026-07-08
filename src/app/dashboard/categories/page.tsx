export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isAdminRole, isStaffRole } from '@/types/database'
import CategoryManager from '@/components/shared/CategoryManager'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Categories — Dashboard' }

export default async function CategoriesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = (profile as { role?: string } | null)?.role ?? ''
  if (!isStaffRole(role)) redirect('/')
  if (!isAdminRole(role)) redirect('/dashboard')

  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase.from('product_categories').select('*').order('sort_order').order('name'),
    supabase.from('products').select('category_id, active'),
  ])

  // Product counts per category (drives the "reassign first" guard on delete).
  const counts = new Map<number, { total: number; active: number }>()
  for (const p of products ?? []) {
    if (p.category_id == null) continue
    const c = counts.get(p.category_id) ?? { total: 0, active: 0 }
    c.total++
    if (p.active) c.active++
    counts.set(p.category_id, c)
  }
  const rows = (categories ?? []).map((c) => ({
    ...c,
    productCount: counts.get(c.id)?.total ?? 0,
    activeCount: counts.get(c.id)?.active ?? 0,
  }))

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Categories</h1>
        <p className="text-sm text-muted-foreground">
          Storefront product buckets — order, icon, blurb, and visibility. Changes go live instantly.
        </p>
      </div>
      <CategoryManager initial={rows} />
    </div>
  )
}
