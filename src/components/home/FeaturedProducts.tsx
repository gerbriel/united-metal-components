import Link from 'next/link'
import { Package, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { ButtonLink } from '@/components/ui/button-link'

type Product = {
  id: string
  name: string
  description: string | null
  price: number
  unit: string | null
  product_categories?: { name: string } | null
}

export default function FeaturedProducts({ products }: { products: Product[] }) {
  if (products.length === 0) return null

  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-12">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-3 block">
              Top Sellers
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Featured Products</h2>
            <p className="text-muted-foreground mt-2 text-lg">Our most popular building materials</p>
          </div>
          <ButtonLink
            href="/products"
            variant="outline"
            className="hidden sm:inline-flex items-center gap-2 group"
          >
            View All
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </ButtonLink>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((p) => (
            <Link key={p.id} href={`/products/${p.id}`} className="group block">
              <Card className="h-full border-slate-200 hover:border-primary hover:shadow-xl transition-all duration-300 overflow-hidden">
                {/* Product image placeholder */}
                <div className="aspect-[16/9] bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center relative overflow-hidden">
                  <Package className="w-14 h-14 text-slate-300 group-hover:text-primary/40 transition-colors duration-300" />
                  <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/3 transition-colors duration-300" />
                </div>

                <CardContent className="p-5">
                  <p className="text-xs font-medium text-orange-500 mb-1.5">
                    {(p as any).product_categories?.name ?? 'Metal Components'}
                  </p>
                  <h3 className="font-semibold text-base text-foreground group-hover:text-primary transition-colors mb-2 leading-snug">
                    {p.name}
                  </h3>
                  {p.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                      {p.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xl font-bold text-primary">${p.price.toFixed(2)}</span>
                      {p.unit && (
                        <span className="text-xs text-muted-foreground ml-1">/ {p.unit}</span>
                      )}
                    </div>
                    <span className="text-xs font-medium text-orange-500 group-hover:text-orange-600 flex items-center gap-1">
                      View Details <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="sm:hidden mt-8 text-center">
          <ButtonLink href="/products" variant="outline" className="w-full justify-center">
            View All Products
          </ButtonLink>
        </div>
      </div>
    </section>
  )
}
