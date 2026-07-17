'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { COLORS, type FinishClass } from '@/lib/product-config'

// A palette entry, shape-compatible with product-config's ColorEntry so it drops
// straight into existing color pickers and swatchStyle().
export interface Finish {
  name: string
  hex: string
  textDark: boolean
  gradient?: string
  texture?: string
  finishClass: FinishClass
}

// Live color palette from the DB `finishes` table (active rows, in sort order).
// Starts from — and falls back to — the hardcoded COLORS constant, so pickers
// always render even before the fetch resolves or if it fails / returns empty.
// Anonymous storefront visitors may read active finishes (migration 055 RLS), so
// this works on both public and dashboard pages. Swapping a picker to a live,
// staff-editable palette is just `const palette = useFinishes()` in place of COLORS.
export function useFinishes(): Finish[] {
  const [finishes, setFinishes] = useState<Finish[]>(COLORS)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('finishes')
      .select('name, hex, text_dark, gradient, texture, finish_class')
      .eq('active', true)
      .order('sort')
      .then(({ data }) => {
        if (!data || data.length === 0) return
        setFinishes(
          (data as {
            name: string; hex: string; text_dark: boolean
            gradient: string | null; texture: string | null; finish_class: FinishClass
          }[]).map((f) => ({
            name: f.name,
            hex: f.hex,
            textDark: f.text_dark,
            gradient: f.gradient ?? undefined,
            texture: f.texture ?? undefined,
            finishClass: f.finish_class,
          })),
        )
      })
  }, [])

  return finishes
}
