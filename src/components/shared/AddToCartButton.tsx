'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ShoppingCart, Minus, Plus } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { toast } from 'sonner'
import type { Product } from '@/types/database'

export default function AddToCartButton({ product }: { product: Product }) {
  const [qty, setQty] = useState(1)
  const addItem = useCartStore((s) => s.addItem)

  const handleAdd = () => {
    addItem(product, qty)
    toast.success(`${qty} × ${product.name} added to cart`)
  }

  if (product.stock_qty === 0) {
    return <Button disabled className="w-full" size="lg">Out of Stock</Button>
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Label className="text-sm mb-2 block">Quantity{product.unit ? ` (${product.unit}s)` : ''}</Label>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setQty(Math.max(1, qty - 1))}>
            <Minus className="w-4 h-4" />
          </Button>
          <Input
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
            className="w-20 text-center"
          />
          <Button variant="outline" size="icon" onClick={() => setQty(qty + 1)}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <Button size="lg" className="gap-2" onClick={handleAdd}>
        <ShoppingCart className="w-4 h-4" />
        Add to Cart — ${(product.price * qty).toFixed(2)}
      </Button>
    </div>
  )
}
