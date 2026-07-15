import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { SITE_URL } from '@/lib/site'

// Regenerated on request so newly added products appear without a redeploy.
export const dynamic = 'force-dynamic'

// Public, indexable routes only — dashboard/account/api are blocked in robots.
const STATIC_PATHS = ['', '/products', '/overstock', '/about', '/contact', '/pickup', '/privacy', '/terms']

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()
  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase.from('products').select('slug, updated_at').eq('active', true),
    supabase.from('product_categories').select('slug'),
  ])
  const now = new Date()

  return [
    ...STATIC_PATHS.map((p) => ({
      url: `${SITE_URL}${p}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: p === '' ? 1 : 0.7,
    })),
    ...((categories ?? []) as { slug: string }[]).map((c) => ({
      url: `${SITE_URL}/products?cat=${c.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
    ...((products ?? []) as { slug: string; updated_at: string | null }[])
      .filter((p) => p.slug)
      .map((p) => ({
        url: `${SITE_URL}/products/${p.slug}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : now,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      })),
  ]
}
