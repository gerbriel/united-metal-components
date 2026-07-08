export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ProductBrowser from '@/components/shared/ProductBrowser'
import { applyAllProductOverrides } from '@/lib/product-overrides'
import { getNavCategories } from '@/lib/categories'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Products' }

interface Props {
  searchParams: Promise<{ cat?: string; q?: string }>
}

export default async function ProductsPage({ searchParams }: Props) {
  const { cat, q } = await searchParams
  const supabase = await createClient()

  // Storefront-visible categories, in admin-defined order (shared with the header
  // bar / home cards / footer via getNavCategories).
  const categories = await getNavCategories()

  // Fetch the whole active catalog once; search / sort / stock filtering happens
  // client-side in ProductBrowser (category scoping stays URL-driven for the
  // sidebar + shareable links). Overrides run first so re-homed items land in the
  // right category.
  const { data: rawProducts } = await supabase
    .from('products')
    .select('*, product_categories(name, slug)')
    .eq('active', true)
    .order('name')
  const products = applyAllProductOverrides(rawProducts ?? [])

  const activeCategory = categories?.find((c) => c.slug === cat)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Mobile: horizontal scrollable category pills */}
      <div className="lg:hidden mb-6 -mx-4 px-4">
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          <Link href="/products"
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${!cat ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
            All
          </Link>
          {categories?.map((c) => (
            <Link key={c.slug} href={`/products?cat=${c.slug}`}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${cat === c.slug ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
              {c.name}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block lg:w-56 shrink-0">
          <h2 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">Categories</h2>
          <ul className="space-y-1">
            <li>
              <Link href="/products" className={`block px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors ${!cat ? 'bg-primary text-white' : ''}`}>
                All Products
              </Link>
            </li>
            {categories?.map((c) => (
              <li key={c.slug}>
                <Link href={`/products?cat=${c.slug}`} className={`block px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors ${cat === c.slug ? 'bg-primary text-white' : ''}`}>
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        {/* Search / sort / filter + grid */}
        <div className="flex-1 min-w-0">
          <ProductBrowser products={products} cat={cat} categoryName={activeCategory?.name} initialQuery={q} />
        </div>
      </div>
    </div>
  )
}
