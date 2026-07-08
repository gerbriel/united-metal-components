'use client'

import { useMemo, useState } from 'react'
import { Search, X, SlidersHorizontal } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import ProductGrid from '@/components/shared/ProductGrid'
import { groupCatalog } from '@/lib/catalogGroups'
import { buildSearchMatcher } from '@/lib/search'
import type { Product } from '@/types/database'

interface ProductWithCategory extends Product {
  product_categories?: { name: string; slug: string } | null
}

type SortKey = 'featured' | 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc'

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'featured',   label: 'Featured' },
  { value: 'name-asc',   label: 'Name: A–Z' },
  { value: 'name-desc',  label: 'Name: Z–A' },
  { value: 'price-asc',  label: 'Price: Low → High' },
  { value: 'price-desc', label: 'Price: High → Low' },
]

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
  initialQuery = '',
}: {
  products: ProductWithCategory[]
  cat?: string
  categoryName?: string
  initialQuery?: string
}) {
  const [query, setQuery] = useState(initialQuery)
  const [sort, setSort] = useState<SortKey>('featured')
  const [inStockOnly, setInStockOnly] = useState(false)

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

      {/* Controls: search + sort + in-stock */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products… (English or Español)"
            className="w-full h-10 pl-9 pr-9 rounded-lg border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setInStockOnly((v) => !v)}
            className={`inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border text-sm font-medium transition-colors ${
              inStockOnly ? 'border-primary bg-primary/10 text-primary' : 'border-input text-muted-foreground hover:text-foreground'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            In stock
          </button>

          <Select value={sort} onValueChange={(v: string | null) => v && setSort(v as SortKey)}>
            <SelectTrigger className="h-10 w-[168px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ProductGrid products={results} />
    </div>
  )
}
