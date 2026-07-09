'use client'

import { useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import ProductGrid from '@/components/shared/ProductGrid'
import { groupCatalog } from '@/lib/catalogGroups'
import { buildSearchMatcher } from '@/lib/search'
import type { Product } from '@/types/database'

interface ProductWithCategory extends Product {
  product_categories?: { name: string; slug: string } | null
}

type SortKey = 'featured' | 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc'

const SORT_KEYS: SortKey[] = ['featured', 'price-asc', 'price-desc', 'name-asc', 'name-desc']

function sortProducts(list: ProductWithCategory[], sort: SortKey): ProductWithCategory[] {
  const arr = [...list]
  switch (sort) {
    case 'price-asc':  return arr.sort((a, b) => a.price - b.price)
    case 'price-desc': return arr.sort((a, b) => b.price - a.price)
    case 'name-asc':   return arr.sort((a, b) => a.name.localeCompare(b.name))
    case 'name-desc':  return arr.sort((a, b) => b.name.localeCompare(a.name))
    default:           return arr // featured = incoming (name) order
  }
}

export default function ProductBrowser({
  products,
  cat,
  categoryName,
}: {
  products: ProductWithCategory[]
  cat?: string
  categoryName?: string
}) {
  // URL is the source of truth — the header search bar owns q / sort / inStock.
  const searchParams = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const sortParam = searchParams.get('sort')
  const sort: SortKey = SORT_KEYS.includes(sortParam as SortKey) ? (sortParam as SortKey) : 'featured'
  const inStockOnly = searchParams.get('inStock') === '1'

  const searching = query.trim().length > 0
  const matcher = useMemo(() => buildSearchMatcher(query), [query])

  const results = useMemo(() => {
    // Search is global (across every category); otherwise scope to the current
    // category page.
    let list = searching || !cat
      ? products
      : products.filter((p) => p.product_categories?.slug === cat)
    if (searching) {
      list = list.filter((p) =>
        matcher(`${p.name} ${p.sku ?? ''} ${p.description ?? ''} ${p.product_categories?.name ?? ''}`),
      )
    }
    if (inStockOnly) list = list.filter((p) => p.stock_qty > 0)
    return sortProducts(list, sort)
  }, [products, cat, searching, matcher, inStockOnly, sort])

  const count = useMemo(() => groupCatalog(results).length, [results])
  const heading = searching ? `Search: “${query.trim()}”` : (categoryName ?? 'All Products')

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-3xl font-bold">{heading}</h1>
        <p className="text-muted-foreground mt-1">{count} {count === 1 ? 'product' : 'products'}</p>
      </div>

      <ProductGrid products={results} />
    </div>
  )
}
