import PublicHeader from '@/components/layout/PublicHeader'
import PublicFooter from '@/components/layout/PublicFooter'
import AnalyticsTracker from '@/components/shared/AnalyticsTracker'
import RealtimeRefresh from '@/components/shared/RealtimeRefresh'
import { getNavCategories } from '@/lib/categories'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const categories = await getNavCategories()

  return (
    <>
      <PublicHeader categories={categories} />
      <main className="flex-1">{children}</main>
      <PublicFooter categories={categories} />
      <AnalyticsTracker />
      <RealtimeRefresh />
    </>
  )
}
