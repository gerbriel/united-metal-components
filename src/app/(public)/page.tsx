import Link from 'next/link'
import { ButtonLink } from '@/components/ui/button-link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Package, Shield, Truck, Phone, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

async function getFeaturedProducts() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('products')
    .select('*, product_categories(name, slug)')
    .eq('active', true)
    .in('sku', ['PANEL-29GA', 'GARAGE-10X10', 'TUBE-2.5-14GA', 'TRUSS-22-24', 'BUNDLE-PKG', 'INS-4FT-ROLL'])
    .limit(6)
  return data ?? []
}

const categories = [
  { name: 'Sheet Metal Panels', slug: 'panels', icon: '🏗️', desc: '29 GA painted & galvalume panels' },
  { name: 'Doors & Hardware', slug: 'doors-hardware', icon: '🚪', desc: 'Walk-in doors to 14×14 garage doors' },
  { name: 'Square Tubing', slug: 'square-tubing', icon: '📦', desc: '12 & 14 GA structural tubing' },
  { name: 'Trusses', slug: 'trusses', icon: '🏠', desc: "18' to 30' span trusses" },
  { name: 'Anchors', slug: 'anchors', icon: '⚓', desc: 'Asphalt, concrete & mobile home' },
  { name: 'Insulation', slug: 'insulation', icon: '🌡️', desc: 'Rolls & bubble wrap insulation' },
]

export default async function HomePage() {
  const featured = await getFeaturedProducts()

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,.05) 40px, rgba(255,255,255,.05) 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,.05) 40px, rgba(255,255,255,.05) 41px)' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <Badge className="mb-4 bg-primary/20 text-primary border-primary/30">Quality Metal Components</Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6 max-w-3xl">
            Build Strong with{' '}
            <span className="text-primary">Premium Metal</span>{' '}
            Components
          </h1>
          <p className="text-lg text-slate-300 mb-8 max-w-2xl">
            Sheet metal panels, carport kits, garage doors, structural tubing, trusses, and more — everything you need for your metal building project.
          </p>
          <div className="flex flex-wrap gap-4">
            <ButtonLink href="/products" size="lg">
              Shop All Products <ArrowRight className="ml-2 w-4 h-4" />
            </ButtonLink>
            <ButtonLink href="/contact" size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
              Get a Quote
            </ButtonLink>
          </div>

          <div className="grid grid-cols-3 gap-6 mt-16 max-w-lg">
            {[['50+', 'Products'], ['Fast', 'Shipping'], ['Expert', 'Support']].map(([v, l]) => (
              <div key={l} className="text-center">
                <div className="text-2xl font-bold text-primary">{v}</div>
                <div className="text-sm text-slate-400">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="bg-primary text-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center text-sm font-medium">
            {([
              [Truck, 'Fast Delivery'],
              [Shield, 'Quality Guaranteed'],
              [Phone, 'Expert Support'],
              [Star, 'Trusted Supplier'],
            ] as const).map(([Icon, label]) => (
              <div key={label} className="flex items-center justify-center gap-2">
                <Icon className="w-4 h-4" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold">Shop by Category</h2>
            <p className="text-muted-foreground mt-2">Everything for your metal building project</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((cat) => (
              <Link key={cat.slug} href={`/products?cat=${cat.slug}`}>
                <Card className="group hover:border-primary hover:shadow-md transition-all cursor-pointer h-full">
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl mb-2">{cat.icon}</div>
                    <h3 className="font-semibold text-sm leading-tight group-hover:text-primary transition-colors">{cat.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-tight">{cat.desc}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured products */}
      {featured.length > 0 && (
        <section className="py-16 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-3xl font-bold">Featured Products</h2>
                <p className="text-muted-foreground mt-1">Our most popular building materials</p>
              </div>
              <ButtonLink href="/products" variant="outline">View All <ArrowRight className="ml-2 w-4 h-4" /></ButtonLink>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featured.map((p) => (
                <Link key={p.id} href={`/products/${p.id}`}>
                  <Card className="group hover:shadow-lg transition-shadow h-full">
                    <div className="aspect-video bg-slate-200 rounded-t-lg flex items-center justify-center">
                      <Package className="w-12 h-12 text-slate-400 group-hover:text-primary transition-colors" />
                    </div>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">{(p as any).product_categories?.name}</p>
                      <h3 className="font-semibold group-hover:text-primary transition-colors">{p.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-lg font-bold text-primary">${p.price.toFixed(2)}</span>
                        {p.unit && <span className="text-xs text-muted-foreground">per {p.unit}</span>}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-16 bg-slate-900 text-white text-center">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Your Project?</h2>
          <p className="text-slate-300 mb-8">Create an account to place orders, track shipments, and get notified when your materials are ready for pickup.</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <ButtonLink href="/signup" size="lg">Create Free Account</ButtonLink>
            <ButtonLink href="/products" size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">Browse Products</ButtonLink>
          </div>
        </div>
      </section>
    </div>
  )
}
