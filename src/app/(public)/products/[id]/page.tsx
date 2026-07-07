export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ProductOrderForm from '@/components/shared/ProductOrderForm'
import ProductViewer from '@/components/product3d/ProductViewer'
import DoorSizeSelect from '@/components/shared/DoorSizeSelect'
import VariantSelect, { type VariantOption } from '@/components/shared/VariantSelect'
import { isRollupDoor, doorLineKey, sortDoorProducts, parseDoorSize, isCommonDoorSize } from '@/lib/doorLines'
import { variantGroupFor } from '@/lib/product-config'
import { applyProductOverrides } from '@/lib/product-overrides'
import { Badge } from '@/components/ui/badge'
import { Weight, Ruler } from 'lucide-react'
import Link from 'next/link'
import type { Metadata } from 'next'

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('products').select('name, sku').eq('id', id).single()
  return { title: data ? applyProductOverrides(data).name : 'Product' }
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: rawProduct }, { data: { user } }] = await Promise.all([
    supabase.from('products').select('*, product_categories(name, slug)').eq('id', id).single(),
    supabase.auth.getUser(),
  ])

  // Soft-deleted products (active = false) stay in the DB for historical orders
  // but must not be reachable on the public storefront, including by direct URL.
  if (!rawProduct || !rawProduct.active) notFound()
  const product = applyProductOverrides(rawProduct)

  let isContractor = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('customer_type')
      .eq('id', user.id)
      .single()
    isContractor = (profile as any)?.customer_type === 'contractor'
  }

  // Variant groups (tubing gauges, screw packages — see VARIANT_GROUPS): offer
  // the group's other SKUs as a dropdown, exactly like door sizes.
  const vgroup = variantGroupFor(product.sku)
  let variantOptions: VariantOption[] | null = null
  if (vgroup) {
    const { data: vsiblings } = await supabase
      .from('products')
      .select('id, sku')
      .in('sku', vgroup.members.map((m) => m.sku))
      .eq('active', true)
    if (vsiblings && vsiblings.length > 1) {
      const idBySku = new Map(vsiblings.map((s) => [s.sku, s.id]))
      variantOptions = vgroup.members
        .filter((m) => idBySku.has(m.sku))
        .map((m) => ({ id: idBySku.get(m.sku)!, label: m.label, section: m.section }))
    }
  }
  const variantIds = new Set(variantOptions?.map((o) => o.id) ?? [])

  const { data: relatedRaw } = await supabase
    .from('products')
    .select('id, name, sku, price, unit')
    .eq('category_id', product.category_id ?? 0)
    .neq('id', product.id)
    .eq('active', true)
    .limit(4)
  const related = relatedRaw?.map(applyProductOverrides).filter((r) => !variantIds.has(r.id))

  // Roll-up doors: every size is its own SKU — offer the line's other sizes as
  // a dropdown (common sizes first) instead of leaving them as separate finds.
  let sizeOptions: { id: number; label: string; common: boolean }[] | null = null
  if (isRollupDoor(product)) {
    const { data: siblings } = await supabase
      .from('products')
      .select('id, name, sku')
      .like('sku', `${doorLineKey(product)}-%`)
      .eq('category_id', product.category_id ?? 0)
      .eq('active', true)
    if (siblings && siblings.length > 1) {
      sizeOptions = sortDoorProducts(siblings).map((s) => ({
        id: s.id,
        label: parseDoorSize(s.name)?.label ?? s.name,
        common: isCommonDoorSize(s.name),
      }))
    }
  }

  const cat = (product as any).product_categories
  // With a variant dropdown carrying the size/package, the page titles as the
  // group ("14 GA Square Tubing") rather than the member SKU's full name.
  const displayName = variantOptions && vgroup ? vgroup.name : product.name

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/products" className="hover:text-primary">Products</Link>
        {cat && <>
          <span>/</span>
          <Link href={`/products?cat=${cat.slug}`} className="hover:text-primary">{cat.name}</Link>
        </>}
        <span>/</span>
        <span className="text-foreground">{displayName}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-10">
        {/* Interactive 3D rendering (replaces static product image) */}
        <ProductViewer product={product} />

        {/* Info */}
        <div>
          {cat && <Badge variant="secondary" className="mb-3">{cat.name}</Badge>}
          <h1 className="text-3xl font-bold mb-2">{displayName}</h1>
          {product.sku && <p className="text-sm text-muted-foreground mb-4">SKU: {product.sku}</p>}

          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-slate-50 border rounded-lg">
            <span className="text-sm text-muted-foreground italic">Pricing available upon request</span>
          </div>

          {product.description && (
            <p className="text-muted-foreground mt-4 mb-6">{product.description}</p>
          )}

          <div className="grid grid-cols-2 gap-3 mb-6">
            {product.weight_lbs && (
              <div className="flex items-center gap-2 text-sm p-3 bg-slate-50 rounded-lg">
                <Weight className="w-4 h-4 text-muted-foreground" />
                <span>{product.weight_lbs} lbs</span>
              </div>
            )}
            {product.unit && (
              <div className="flex items-center gap-2 text-sm p-3 bg-slate-50 rounded-lg">
                <Ruler className="w-4 h-4 text-muted-foreground" />
                <span>Sold per {product.unit}</span>
              </div>
            )}
          </div>

          {sizeOptions && <DoorSizeSelect options={sizeOptions} currentId={product.id} />}
          {variantOptions && vgroup && (
            <VariantSelect label={vgroup.selectLabel} options={variantOptions} currentId={product.id} />
          )}

          <div className="flex items-center gap-2 mb-6">
            {product.stock_qty > 0 ? (
              <Badge className="bg-green-100 text-green-800 border-green-200">
                In Stock ({product.stock_qty} available)
              </Badge>
            ) : (
              <Badge variant="secondary">Out of Stock</Badge>
            )}
          </div>

          <ProductOrderForm product={product} isContractor={isContractor} />
        </div>
      </div>

      {/* Related products */}
      {related && related.length > 0 && (
        <div className="mt-16">
          <h2 className="text-xl font-bold mb-6">More in {cat?.name}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {related.map((r) => (
              <Link key={r.id} href={`/products/${r.id}`} className="p-4 border rounded-lg hover:border-primary hover:shadow-sm transition-all">
                <p className="font-medium text-sm leading-tight">{r.name}</p>
                <p className="text-xs text-muted-foreground italic mt-2">Contact for pricing{r.unit && ` · per ${r.unit}`}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
