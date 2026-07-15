'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ShoppingCart } from 'lucide-react'
import ProductThumb from '@/components/product3d/ProductThumb'
import { doorLineName, isCommonDoorSize, parseDoorSize } from '@/lib/doorLines'
import { useCartStore } from '@/store/cart'
import { toast } from 'sonner'
import type { Product } from '@/types/database'

interface ProductWithCategory extends Product {
  product_categories?: { name: string; slug: string } | null
}

// One card per door model line: a single 3D thumb plus a size dropdown covering
// every SKU in the line. Only common sizes update the 3D render — picking an
// odd size keeps the last common-size render and just switches what you order.
export default function DoorLineCard({ products }: { products: ProductWithCategory[] }) {
  const addItem = useCartStore((s) => s.addItem)
  // products arrive sorted: common sizes first, so [0] is the default render.
  const [selectedId, setSelectedId] = useState(String(products[0].id))
  const [renderId, setRenderId] = useState(String(products[0].id))

  const selected = products.find((p) => String(p.id) === selectedId) ?? products[0]
  const rendered = products.find((p) => String(p.id) === renderId) ?? products[0]

  const common = products.filter((p) => isCommonDoorSize(p.name))
  const other = products.filter((p) => !isCommonDoorSize(p.name))

  const handleSizeChange = (id: string | null) => {
    if (!id) return
    setSelectedId(id)
    const p = products.find((x) => String(x.id) === id)
    if (p && isCommonDoorSize(p.name)) setRenderId(id)
  }

  const handleAdd = () => {
    addItem(selected)
    toast.success(`${selected.name} added to cart`)
  }

  const sizeLabel = (p: ProductWithCategory) => parseDoorSize(p.name)?.label ?? p.name

  return (
    <Card className="group hover:shadow-lg transition-shadow h-full flex flex-col">
      <Link href={`/products/${selected.slug}`} className="block aspect-video bg-gradient-to-b from-slate-50 to-slate-200 rounded-t-lg overflow-hidden">
        <ProductThumb product={rendered} />
      </Link>
      <CardContent className="p-4 flex flex-col flex-1">
        {products[0].product_categories && (
          <Badge variant="secondary" className="w-fit mb-2 text-xs">{products[0].product_categories.name}</Badge>
        )}
        <Link href={`/products/${selected.slug}`}>
          <h3 className="font-semibold leading-tight group-hover:text-primary transition-colors line-clamp-2">
            {doorLineName(products[0].name)}
          </h3>
        </Link>
        <p className="text-xs text-muted-foreground mt-1 flex-1">
          {products.length} sizes available
        </p>
        <div className="mt-3">
          <Select value={selectedId} onValueChange={handleSizeChange}>
            <SelectTrigger className="w-full h-9">
              <SelectValue placeholder="Select size">{sizeLabel(selected)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {common.length > 0 && (
                <SelectGroup>
                  <SelectLabel>Common sizes</SelectLabel>
                  {common.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{sizeLabel(p)}</SelectItem>
                  ))}
                </SelectGroup>
              )}
              {other.length > 0 && (
                <SelectGroup>
                  <SelectLabel>More sizes</SelectLabel>
                  {other.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{sizeLabel(p)}</SelectItem>
                  ))}
                </SelectGroup>
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <span className="text-xs text-muted-foreground italic">
            {selected.unit ? `Sold per ${selected.unit}` : 'Contact for pricing'}
          </span>
          {selected.stock_qty > 0 ? (
            <Button size="sm" onClick={handleAdd} className="gap-1">
              <ShoppingCart className="w-3 h-3" /> Add
            </Button>
          ) : (
            <Badge variant="secondary" className="text-xs">Out of Stock</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
