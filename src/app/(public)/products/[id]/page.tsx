export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import AddToCartButton from '@/components/shared/AddToCartButton'
import { Badge } from '@/components/ui/badge'
import { Package, Weight, Ruler } from 'lucide-react'
import Link from 'next/link'
import type { Metadata } from 'next'

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('products').select('name').eq('id', id).single()
  return { title: data?.name ?? 'Product' }
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: product } = await supabase
    .from('products')
    .select('*, product_categories(name, slug)')
    .eq('id', id)
    .single()

  if (!product) notFound()

  const { data: related } = await supabase
    .from('products')
    .select('id, name, price, unit')
    .eq('category_id', product.category_id ?? 0)
    .neq('id', product.id)
    .eq('active', true)
    .limit(4)

  const cat = (product as any).product_categories

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
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-10">
        {/* Image placeholder */}
        <div className="aspect-square bg-slate-100 rounded-xl flex items-center justify-center">
          <Package className="w-24 h-24 text-slate-300" />
        </div>

        {/* Info */}
        <div>
          {cat && <Badge variant="secondary" className="mb-3">{cat.name}</Badge>}
          <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
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

          <div className="flex items-center gap-2 mb-6">
            {product.stock_qty > 0 ? (
              <Badge className="bg-green-100 text-green-800 border-green-200">
                In Stock ({product.stock_qty} available)
              </Badge>
            ) : (
              <Badge variant="secondary">Out of Stock</Badge>
            )}
          </div>

          <AddToCartButton product={product} />
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
