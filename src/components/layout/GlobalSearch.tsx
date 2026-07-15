'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search, X, SlidersHorizontal } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { buildSearchMatcher } from '@/lib/search'
import { cn } from '@/lib/utils'

// Global product search — lives in the header nav on every page. As you type it
// shows product suggestions and, on the products page, filters the grid live
// (debounced) via the q URL param; ProductBrowser reads q/sort/inStock from the
// URL (the single source of truth) — see src/lib/search.ts. Enter / "See all"
// routes to /products?q=…; picking a suggestion jumps straight to that product.
const SORTS = [
  { value: 'featured',   label: 'Featured' },
  { value: 'name-asc',   label: 'Name: A–Z' },
  { value: 'name-desc',  label: 'Name: Z–A' },
  { value: 'price-asc',  label: 'Price: Low → High' },
  { value: 'price-desc', label: 'Price: High → Low' },
]

export interface ProductSearchItem {
  id: number
  name: string
  sku: string | null
  slug: string
}

export default function GlobalSearch({
  className,
  onSubmitted,
  products = [],
}: {
  className?: string
  onSubmitted?: () => void
  products?: ProductSearchItem[]
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const onProducts = pathname === '/products'

  const [q, setQ] = useState('')
  const [openSuggest, setOpenSuggest] = useState(false)
  const focusedRef = useRef(false)
  const filterTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reflect the active query when arriving on the products page (e.g. via a
  // link) — but NOT while the user is typing here, or it'd clobber their input
  // mid-keystroke as the live filter round-trips through the URL.
  useEffect(() => {
    if (onProducts && !focusedRef.current) setQ(searchParams.get('q') ?? '')
  }, [onProducts, searchParams])

  const sort = searchParams.get('sort') ?? 'featured'
  const inStock = searchParams.get('inStock') === '1'

  const suggestions = useMemo(() => {
    const query = q.trim()
    if (query.length < 2 || products.length === 0) return []
    const match = buildSearchMatcher(query)
    return products.filter((p) => match(`${p.name} ${p.sku ?? ''}`)).slice(0, 7)
  }, [q, products])

  // Build a /products URL, preserving current params only when already there.
  const pushParams = (mutate: (p: URLSearchParams) => void, replace = false) => {
    const p = new URLSearchParams(onProducts ? Array.from(searchParams.entries()) : [])
    mutate(p)
    const qs = p.toString()
    const url = `/products${qs ? `?${qs}` : ''}`
    if (replace) router.replace(url)
    else router.push(url)
  }

  const setQParam = (p: URLSearchParams, value: string) => {
    const v = value.trim()
    if (v) p.set('q', v); else p.delete('q')
  }

  // Debounced live filter of the grid — only meaningful on the products page.
  const liveFilter = (value: string) => {
    if (!onProducts) return
    if (filterTimer.current) clearTimeout(filterTimer.current)
    filterTimer.current = setTimeout(() => pushParams((p) => setQParam(p, value), true), 200)
  }

  const onChange = (value: string) => {
    setQ(value)
    setOpenSuggest(true)
    liveFilter(value)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setOpenSuggest(false)
    pushParams((p) => setQParam(p, q))
    onSubmitted?.()
  }

  const pickSuggestion = (slug: string) => {
    setOpenSuggest(false)
    router.push(`/products/${slug}`)
    onSubmitted?.()
  }

  const clear = () => {
    setQ('')
    setOpenSuggest(false)
    if (onProducts) pushParams((p) => p.delete('q'), true)
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <form onSubmit={submit} role="search" className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="search"
          value={q}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => { focusedRef.current = true; if (q.trim().length >= 2) setOpenSuggest(true) }}
          onBlur={() => {
            focusedRef.current = false
            if (blurTimer.current) clearTimeout(blurTimer.current)
            blurTimer.current = setTimeout(() => setOpenSuggest(false), 120)
          }}
          placeholder="Search products… (English or Español)"
          aria-label="Search products"
          autoComplete="off"
          className="w-full h-9 pl-9 pr-9 rounded-lg border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-search-cancel-button]:hidden"
        />
        {q && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Autocomplete suggestions */}
        {openSuggest && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border bg-background shadow-lg overflow-hidden">
            <ul className="max-h-80 overflow-y-auto py-1">
              {suggestions.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); pickSuggestion(s.slug) }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                  >
                    <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{s.name}</span>
                    {s.sku && <span className="ml-auto text-xs text-muted-foreground shrink-0">{s.sku}</span>}
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); setOpenSuggest(false); pushParams((p) => setQParam(p, q)); onSubmitted?.() }}
              className="w-full border-t bg-slate-50 px-3 py-2 text-left text-sm font-medium text-primary hover:bg-accent transition-colors"
            >
              See all results for “{q.trim()}”
            </button>
          </div>
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
