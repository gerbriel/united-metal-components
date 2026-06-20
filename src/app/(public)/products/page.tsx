export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import ProductGrid from '@/components/shared/ProductGrid'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Products' }

interface Props {
  searchParams: Promise<{ cat?: string; q?: string }>
}

export default async function ProductsPage({ searchParams }: Props) {
  const { cat, q } = await searchParams
  const supabase = await createClient()

  // Fetch categories
  const { data: categories } = await supabase.from('product_categories').select('*').order('name')

  // Build query
  let query = supabase
    .from('products')
    .select('*, product_categories(name, slug)')
    .eq('active', true)
    .order('name')

  if (cat) {
    const { data: catRow } = await supabase.from('product_categories').select('id').eq('slug', cat).single()
    if (catRow) query = query.eq('category_id', catRow.id)
  }
  if (q) query = query.ilike('name', `%${q}%`)

  const { data: products } = await query

  const activeCategory = categories?.find((c) => c.slug === cat)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          {activeCategory ? activeCategory.name : q ? `Search: "${q}"` : 'All Products'}
        </h1>
        <p className="text-muted-foreground mt-1">{products?.length ?? 0} products</p>
      </div>

      {/* Mobile: horizontal scrollable filter pills */}
      <div className="lg:hidden mb-6 -mx-4 px-4">
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          <a href="/products"
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${!cat ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
            All
          </a>
          {categories?.map((c) => (
            <a key={c.id} href={`/products?cat=${c.slug}`}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${cat === c.slug ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
              {c.name}
            </a>
          ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block lg:w-56 shrink-0">
          <h2 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">Categories</h2>
          <ul className="space-y-1">
            <li>
              <a href="/products" className={`block px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors ${!cat ? 'bg-primary text-white' : ''}`}>
                All Products
              </a>
            </li>
            {categories?.map((c) => (
              <li key={c.id}>
                <a href={`/products?cat=${c.slug}`} className={`block px-3 py-2 rounded-md text-sm hover:bg-accent transition-colors ${cat === c.slug ? 'bg-primary text-white' : ''}`}>
                  {c.name}
                </a>
              </li>
            ))}
          </ul>
        </aside>

        {/* Product grid */}
        <div className="flex-1">
          <ProductGrid products={products ?? []} />
        </div>
      </div>
    </div>
  )
}
