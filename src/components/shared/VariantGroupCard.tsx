'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ShoppingCart, SlidersHorizontal } from 'lucide-react'
import { ButtonLink } from '@/components/ui/button-link'
import ProductThumb from '@/components/product3d/ProductThumb'
import { variantLabel, variantGroupNeedsConfiguration, type VariantGroup } from '@/lib/product-config'
import { sectionize } from '@/components/shared/VariantSelect'
import { useCartStore } from '@/store/cart'
import { toast } from 'sonner'
import type { Product } from '@/types/database'

interface ProductWithCategory extends Product {
  product_categories?: { name: string; slug: string } | null
}

// One card per variant group (tubing gauge, screw package — see VARIANT_GROUPS):
// a single 3D thumb plus a dropdown covering every member SKU in the group.
export default function VariantGroupCard({
  group,
  products,
}: {
  group: VariantGroup
  products: ProductWithCategory[]
}) {
  const addItem = useCartStore((s) => s.addItem)
  // products arrive in member order, so [0] is the default variant.
  const [selectedId, setSelectedId] = useState(String(products[0].id))
  const selected = products.find((p) => String(p.id) === selectedId) ?? products[0]

  const optionLabel = (p: ProductWithCategory) => variantLabel(group, p.sku) ?? p.name
  const section = (p: ProductWithCategory) =>
    group.members.find((m) => m.sku === p.sku)?.section
  const noun = group.selectLabel.toLowerCase()
  // Tubing (needs a cut length) and colored screws (need a color) can't be added
  // straight from the card — the dropdown only picks the size/package — so route
  // to the product page to finish choosing, like the other configurable products.
  const needsConfig = variantGroupNeedsConfiguration(group)

  const handleAdd = () => {
    addItem(selected)
    toast.success(`${selected.name} added to cart`)
  }

  return (
    <Card className="group hover:shadow-lg transition-shadow h-full flex flex-col">
      <Link href={`/products/${selected.slug}`} className="block aspect-video bg-gradient-to-b from-slate-50 to-slate-200 rounded-t-lg overflow-hidden">
        <ProductThumb product={selected} />
      </Link>
      <CardContent className="p-4 flex flex-col flex-1">
        {products[0].product_categories && (
          <Badge variant="secondary" className="w-fit mb-2 text-xs">{products[0].product_categories.name}</Badge>
        )}
        <Link href={`/products/${selected.slug}`}>
          <h3 className="font-semibold leading-tight group-hover:text-primary transition-colors line-clamp-2">
            {group.name}
          </h3>
        </Link>
        <p className="text-xs text-muted-foreground mt-1 flex-1">
          {products.length} {products.length === 1 ? noun : `${noun}s`} available
        </p>
        <div className="mt-3">
          <Select value={selectedId} onValueChange={(id) => id && setSelectedId(id)}>
            <SelectTrigger className="w-full h-9">
              <SelectValue placeholder={`Select ${noun}`}>{optionLabel(selected)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {sectionize(
                products.map((p) => ({ id: p.id, label: optionLabel(p), section: section(p) })),
              ).map((s, i) => (
                <SelectGroup key={s.title ?? i}>
                  {s.title && <SelectLabel>{s.title}</SelectLabel>}
                  {s.options.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>{o.label}</SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <span className="text-xs text-muted-foreground italic">
            {selected.unit ? `Sold per ${selected.unit}` : 'Contact for pricing'}
          </span>
          {needsConfig ? (
            <ButtonLink href={`/products/${selected.slug}`} size="sm" variant="outline" className="gap-1">
              <SlidersHorizontal className="w-3 h-3" /> Select options
            </ButtonLink>
          ) : selected.stock_qty > 0 ? (
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
