'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search, X, SlidersHorizontal } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

// Global product search — lives in the header nav on every page. Submitting routes
// to /products?q=…, where ProductBrowser runs the bilingual, category-wide match
// (see src/lib/search.ts). The URL is the single source of truth: q / sort /
// inStock are all query params, so the results page and this bar stay in sync
// without shared React state.
//
// Sort + in-stock controls appear NEXT TO the search box ONLY on the products
// page — everywhere else it's just the search box.
const SORTS = [
  { value: 'featured',   label: 'Featured' },
  { value: 'name-asc',   label: 'Name: A–Z' },
  { value: 'name-desc',  label: 'Name: Z–A' },
  { value: 'price-asc',  label: 'Price: Low → High' },
  { value: 'price-desc', label: 'Price: High → Low' },
]

export default function GlobalSearch({
  className,
  onSubmitted,
}: {
  className?: string
  onSubmitted?: () => void
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const onProducts = pathname === '/products'

  const [q, setQ] = useState('')
  // Reflect the active query when on the products page (e.g. arriving via a link).
  useEffect(() => {
    if (onProducts) setQ(searchParams.get('q') ?? '')
  }, [onProducts, searchParams])

  const sort = searchParams.get('sort') ?? 'featured'
  const inStock = searchParams.get('inStock') === '1'

  // Build a /products URL, preserving the current params only when already on the
  // products page (so a search from elsewhere starts clean).
  const pushParams = (mutate: (p: URLSearchParams) => void, replace = false) => {
    const p = new URLSearchParams(onProducts ? Array.from(searchParams.entries()) : [])
    mutate(p)
    const qs = p.toString()
    const url = `/products${qs ? `?${qs}` : ''}`
    if (replace) router.replace(url)
    else router.push(url)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const query = q.trim()
    pushParams((p) => { if (query) p.set('q', query); else p.delete('q') })
    onSubmitted?.()
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <form onSubmit={submit} role="search" className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products… (English or Español)"
          aria-label="Search products"
          className="w-full h-9 pl-9 pr-9 rounded-lg border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-search-cancel-button]:hidden"
        />
        {q && (
          <button
            type="button"
            onClick={() => { setQ(''); if (onProducts) pushParams((p) => p.delete('q'), true) }}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </form>

      {/* Sort + in-stock — products page only */}
      {onProducts && (
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => pushParams((p) => { if (inStock) p.delete('inStock'); else p.set('inStock', '1') }, true)}
            aria-pressed={inStock}
            className={cn(
              'inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border text-sm font-medium transition-colors',
              inStock ? 'border-primary bg-primary/10 text-primary' : 'border-input text-muted-foreground hover:text-foreground',
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden lg:inline">In stock</span>
          </button>

          <Select value={sort} onValueChange={(v: string | null) => v && pushParams((p) => p.set('sort', v), true)}>
            <SelectTrigger className="h-9 w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}
