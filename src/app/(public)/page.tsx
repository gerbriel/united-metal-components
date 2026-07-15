import { createClient } from '@/lib/supabase/server'
import HeroSection from '@/components/home/HeroSection'
import StatsBar from '@/components/home/StatsBar'
import CategoryCards from '@/components/home/CategoryCards'
import FeaturesSection from '@/components/home/FeaturesSection'
import HowItWorks from '@/components/home/HowItWorks'
import TestimonialsSection from '@/components/home/TestimonialsSection'
import FeaturedProducts from '@/components/home/FeaturedProducts'
import CtaBanner from '@/components/home/CtaBanner'
import { SITE_URL } from '@/lib/site'
import type { Testimonial } from '@/types/database'

// Organization + WebSite structured data so search engines and AI agents can
// resolve the business entity, contact, and search endpoint.
const ORG_JSONLD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'United Metal Components',
      url: SITE_URL,
      telephone: '+1-559-567-9117',
      email: 'sales@unitedmetalcomponents.com',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '9191 W Whitesbridge Ave',
        addressLocality: 'Fresno',
        addressRegion: 'CA',
        postalCode: '93706',
        addressCountry: 'US',
      },
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: 'United Metal Components',
      publisher: { '@id': `${SITE_URL}/#organization` },
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/products?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
  ],
}

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

async function getTestimonials(): Promise<Testimonial[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('testimonials')
    .select('*')
    .eq('active', true)
    .order('sort_order')
    .order('id')
  return (data ?? []) as Testimonial[]
}

export default async function HomePage() {
  const [featured, testimonials] = await Promise.all([getFeaturedProducts(), getTestimonials()])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSONLD) }} />
      <HeroSection />
      <StatsBar />
      <CategoryCards />
      <FeaturesSection />
      <HowItWorks />
      <FeaturedProducts products={featured as any} />
      <TestimonialsSection items={testimonials} />
      <CtaBanner />
    </>
  )
}
