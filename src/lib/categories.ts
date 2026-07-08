import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { NavCategory } from '@/lib/nav-categories'

// Categories shown in the storefront nav (header bar, home cards, footer,
// sidebar), in display order. Wrapped in React cache() so the header, footer,
// and page all share a single query per request.
export const getNavCategories = cache(async (): Promise<NavCategory[]> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('product_categories')
    .select('slug, name, description, icon, sort_order')
    .eq('nav_visible', true)
    .order('sort_order')
    .order('name')
  return (data ?? []) as NavCategory[]
})
