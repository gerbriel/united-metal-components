import PublicHeader from '@/components/layout/PublicHeader'
import PublicFooter from '@/components/layout/PublicFooter'
import AnalyticsTracker from '@/components/shared/AnalyticsTracker'
import RealtimeRefresh from '@/components/shared/RealtimeRefresh'
import CartSync from '@/components/shared/CartSync'
import Announcements from '@/components/announcements/Announcements'
import { getNavCategories } from '@/lib/categories'
import { createClient } from '@/lib/supabase/server'
import { applyAllProductOverrides } from '@/lib/product-overrides'
import type { Announcement } from '@/types/database'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const now = new Date().toISOString()
  // Lightweight catalog index (display names via overrides) for the header
  // search autocomplete — present on every public page.
  const [categories, { data: rawProducts }, { data: rawAnnouncements }] = await Promise.all([
    getNavCategories(),
    supabase.from('products').select('id, name, sku, slug').eq('active', true).order('name'),
    // Only currently-live promotions. Filtered explicitly (not just via RLS) so an
    // admin browsing the storefront doesn't see their own drafts/scheduled rows.
    supabase.from('announcements').select('*')
      .eq('active', true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .order('priority', { ascending: false })
      .order('id', { ascending: false }),
  ])
  const productIndex = applyAllProductOverrides(rawProducts ?? []).map((p) => ({
    id: p.id, name: p.name, sku: p.sku, slug: (p as { slug: string }).slug,
  }))

  return (
    <>
      <Announcements items={(rawAnnouncements ?? []) as Announcement[]} />
      <PublicHeader categories={categories} products={productIndex} />
      <main className="flex-1">{children}</main>
      <PublicFooter categories={categories} />
      <AnalyticsTracker />
      <RealtimeRefresh />
      <CartSync />
    </>
  )
}
