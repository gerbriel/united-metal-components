'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Ruler, ShoppingCart, Tag, Phone } from 'lucide-react'
import ProductThumb from '@/components/product3d/ProductThumb'
import { COLORS } from '@/lib/product-config'
import { useCartStore } from '@/store/cart'
import { toast } from 'sonner'
import type { Product } from '@/types/database'

// One in-stock overstock piece — a distinct product/color/length batch — carrying
// the full parent product (needed for the cart) plus the listing dimensions.
export interface OverstockListing {
  id: number
  product: Product & { product_categories?: { name: string; slug: string } | null }
  color: string | null   // COLORS palette name; null = bare / no color
  lengthFt: number
  lengthIn: number
  qty: number            // net available
}

// "13' 6"" / "10 ft" — how an overstock piece length reads on the storefront.
const fmtLen = (ft: number, inches: number) => (inches ? `${ft}' ${inches}"` : `${ft} ft`)

// Each overstock piece is treated as its own product: a 3D panel rendered in the
// listing's finish, with an Add that drops that exact listing into the cart.
// Prices stay staff-only (quote flow), matching the rest of the catalog.
export default function OverstockGrid({ listings }: { listings: OverstockListing[] }) {
  const addItem = useCartStore((s) => s.addItem)

  if (listings.length === 0) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 px-4">
        <Tag className="w-12 h-12 mx-auto mb-4 text-orange-300" />
        <h2 className="text-lg font-semibold mb-1">No overstock available right now</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Overstock panels are pre-made pieces in limited quantities — once they&apos;re gone, they&apos;re gone.
          Check back soon, or call us for current availability.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/products?cat=panels" className="text-sm font-semibold text-primary hover:underline">
            Browse panels
          </Link>
          <span className="text-slate-300">·</span>
          <a href="tel:+15595679117" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
            <Phone className="w-3.5 h-3.5" />(559) 567-9117
          </a>
        </div>
      </div>
    )
  }

  const handleAdd = (l: OverstockListing) => {
    addItem(l.product, 1, {
      length:      l.lengthFt,
      lengthIn:    l.lengthIn || undefined,
      color:       l.color ?? undefined,
      overstockId: l.id,
    })
    const label = l.color ?? 'Bare'
    toast.success(`${label} panel (${fmtLen(l.lengthFt, l.lengthIn)}) added to cart`)
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
      {listings.map((l) => {
        const entry = l.color ? COLORS.find((c) => c.name === l.color) : null
        const colorLabel = l.color ?? 'Bare'
        return (
          <Card key={l.id} className="group hover:shadow-lg transition-shadow h-full flex flex-col">
            <Link
              href={`/products/${l.product.id}`}
              className="block aspect-video bg-gradient-to-b from-slate-50 to-slate-200 rounded-t-lg overflow-hidden"
            >
              {/* 3D panel rendered in this listing's finish */}
              <ProductThumb product={l.product} colorName={l.color} />
            </Link>
            <CardContent className="p-4 flex flex-col flex-1">
              <Badge className="w-fit mb-2 text-xs bg-orange-100 text-orange-700 border-orange-200">Overstock</Badge>
              <Link href={`/products/${l.product.id}`}>
                <h3 className="font-semibold leading-tight group-hover:text-primary transition-colors">
                  {colorLabel} Panel
                </h3>
              </Link>

              {/* Specs: finish swatch + exact length */}
              <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="w-4 h-4 rounded-full border border-slate-200 shrink-0"
                    style={
                      entry?.gradient ? { backgroundImage: entry.gradient }
                      : entry ? { backgroundColor: entry.hex }
                      : { backgroundColor: '#e2e8f0' }
                    }
                  />
                  {colorLabel}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Ruler className="w-3.5 h-3.5" />
                  {fmtLen(l.lengthFt, l.lengthIn)}
                </span>
              </div>

              <p className="text-xs text-muted-foreground mt-2 flex-1">{l.qty} available</p>

              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                <span className="text-xs text-muted-foreground italic">Contact for pricing</span>
                <Button size="sm" onClick={() => handleAdd(l)} className="gap-1">
                  <ShoppingCart className="w-3 h-3" /> Add
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
