import PublicHeader from '@/components/layout/PublicHeader'
import PublicFooter from '@/components/layout/PublicFooter'
import AnalyticsTracker from '@/components/shared/AnalyticsTracker'
import RealtimeRefresh from '@/components/shared/RealtimeRefresh'
import CartSync from '@/components/shared/CartSync'
import { getNavCategories } from '@/lib/categories'
import { createClient } from '@/lib/supabase/server'
import { applyAllProductOverrides } from '@/lib/product-overrides'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  // Lightweight catalog index (display names via overrides) for the header
  // search autocomplete — present on every public page.
  const [categories, { data: rawProducts }] = await Promise.all([
    getNavCategories(),
    supabase.from('products').select('id, name, sku, slug').eq('active', true).order('name'),
  ])
  const productIndex = applyAllProductOverrides(rawProducts ?? []).map((p) => ({
    id: p.id, name: p.name, sku: p.sku, slug: (p as { slug: string }).slug,
  }))

  return (
    <>
      <PublicHeader categories={categories} products={productIndex} />
      <main className="flex-1">{children}</main>
      <PublicFooter categories={categories} />
      <AnalyticsTracker />
      <RealtimeRefresh />
      <CartSync />
    </>
  )
}
