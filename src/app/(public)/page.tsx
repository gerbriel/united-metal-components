import { createClient } from '@/lib/supabase/server'
import HeroSection from '@/components/home/HeroSection'
import StatsBar from '@/components/home/StatsBar'
import CategoryCards from '@/components/home/CategoryCards'
import FeaturesSection from '@/components/home/FeaturesSection'
import HowItWorks from '@/components/home/HowItWorks'
import TestimonialsSection from '@/components/home/TestimonialsSection'
import FeaturedProducts from '@/components/home/FeaturedProducts'
import CtaBanner from '@/components/home/CtaBanner'

async function getFeaturedProducts() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('products')
    .select('*, product_categories(name, slug)')
    .eq('active', true)
    .in('sku', ['PANEL-29GA', 'GARAGE-10X10', 'TUBE-2.5-14GA', 'TRUSS-22-24', 'BUNDLE-PKG', 'INS-4FT-ROLL'])
    .limit(6)
  return data ?? []
}

export default async function HomePage() {
  const featured = await getFeaturedProducts()

  return (
    <>
      <HeroSection />
      <StatsBar />
      <CategoryCards />
      <FeaturesSection />
      <HowItWorks />
      <FeaturedProducts products={featured as any} />
      <TestimonialsSection />
      <CtaBanner />
    </>
  )
}
