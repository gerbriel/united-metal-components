'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Package, ShoppingCart } from 'lucide-react'
import ProductThumb from '@/components/product3d/ProductThumb'
import DoorLineCard from '@/components/shared/DoorLineCard'
import { groupDoorLines } from '@/lib/doorLines'
import { useCartStore } from '@/store/cart'
import { toast } from 'sonner'
import type { Product } from '@/types/database'

interface ProductWithCategory extends Product {
  product_categories?: { name: string; slug: string } | null
}

export default function ProductGrid({ products }: { products: ProductWithCategory[] }) {
  const addItem = useCartStore((s) => s.addItem)

  if (products.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No products found.</p>
      </div>
    )
  }

  const handleAdd = (e: React.MouseEvent, product: Product) => {
    e.preventDefault()
    addItem(product)
    toast.success(`${product.name} added to cart`)
  }

  // Roll-up doors collapse to one card per model line (with a size dropdown)
  // instead of a card — and a WebGL canvas — per size SKU.
  const entries = groupDoorLines(products)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
      {entries.map((entry) => {
        if (entry.kind === 'doorLine') return <DoorLineCard key={entry.key} products={entry.products} />
        const p = entry.product
        return (
        <Link key={p.id} href={`/products/${p.id}`}>
          <Card className="group hover:shadow-lg transition-shadow h-full flex flex-col">
            <div className="aspect-video bg-gradient-to-b from-slate-50 to-slate-200 rounded-t-lg overflow-hidden">
              <ProductThumb product={p} />
            </div>
            <CardContent className="p-4 flex flex-col flex-1">
              {p.product_categories && (
                <Badge variant="secondary" className="w-fit mb-2 text-xs">{p.product_categories.name}</Badge>
              )}
              <h3 className="font-semibold leading-tight group-hover:text-primary transition-colors line-clamp-2">
                {p.name}
              </h3>
              {p.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 flex-1">{p.description}</p>
              )}
              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                <span className="text-xs text-muted-foreground italic">
                  {p.unit ? `Sold per ${p.unit}` : 'Contact for pricing'}
                </span>
                {p.stock_qty > 0 ? (
                  <Button size="sm" onClick={(e) => handleAdd(e, p)} className="gap-1">
                    <ShoppingCart className="w-3 h-3" /> Add
                  </Button>
                ) : (
                  <Badge variant="secondary" className="text-xs">Out of Stock</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>
        )
      })}
    </div>
  )
}
