import Link from 'next/link'
import { iconFor } from '@/lib/nav-categories'
import { LayoutGrid } from 'lucide-react'

// A category is a tab in the Products sub-nav. `count` is how many products it
// holds (shown next to the label like the accordion group headers).
export interface CategoryNavItem {
  slug: string
  name: string
  icon: string | null
  count: number
}

// Secondary tab bar on the Products inventory screen — one tab per product
// category (plus "All"), so staff focus on a single category at a time instead
// of scrolling every category at once. Categories come from the DB, so new ones
// appear automatically. Navigation is via the `?cat=<slug>` search param, read
// server-side by the Products page.
export default function InventoryCategoryNav({
  categories,
  active,
}: {
  categories: CategoryNavItem[]
  active: string
}) {
  const totalCount = categories.reduce((s, c) => s + c.count, 0)
  const tabs: CategoryNavItem[] = [
    { slug: 'all', name: 'All', icon: null, count: totalCount },
    ...categories,
  ]

  return (
    <div className="flex items-center gap-1 flex-wrap border-b">
      {tabs.map((t) => {
        const Icon = t.slug === 'all' ? LayoutGrid : iconFor(t.icon)
        const isActive = active === t.slug
        return (
          <Link
            key={t.slug}
            href={t.slug === 'all' ? '/dashboard/inventory' : `/dashboard/inventory?cat=${t.slug}`}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {t.name}
            <span className="text-xs font-normal text-muted-foreground">({t.count})</span>
          </Link>
        )
      })}
    </div>
  )
}
