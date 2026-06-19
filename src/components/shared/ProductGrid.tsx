'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Package, ShoppingCart } from 'lucide-react'
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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
      {products.map((p) => (
        <Link key={p.id} href={`/products/${p.id}`}>
          <Card className="group hover:shadow-lg transition-shadow h-full flex flex-col">
            <div className="aspect-video bg-slate-100 rounded-t-lg flex items-center justify-center">
              <Package className="w-10 h-10 text-slate-300 group-hover:text-primary transition-colors" />
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
                <div>
                  <span className="text-lg font-bold text-primary">${p.price.toFixed(2)}</span>
                  {p.unit && <span className="text-xs text-muted-foreground ml-1">/ {p.unit}</span>}
                </div>
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
      ))}
    </div>
  )
}
