'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// Global product search — lives in the header on every page. Submitting routes to
// /products?q=…, where ProductBrowser runs the bilingual, category-wide match
// (see src/lib/search.ts). Kept intentionally dumb: it launches a search, the
// results page owns filtering/sorting.
export default function GlobalSearch({
  className,
  onSubmitted,
}: {
  className?: string
  onSubmitted?: () => void
}) {
  const [q, setQ] = useState('')
  const router = useRouter()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const query = q.trim()
    router.push(query ? `/products?q=${encodeURIComponent(query)}` : '/products')
    onSubmitted?.()
  }

  return (
    <form onSubmit={submit} role="search" className={cn('relative', className)}>
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
          onClick={() => setQ('')}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </form>
  )
}
