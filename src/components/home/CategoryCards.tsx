import Link from 'next/link'
import { Layers, DoorOpen, Package, Home, Anchor, Thermometer } from 'lucide-react'

const categories = [
  {
    name: 'Sheet Metal Panels',
    slug: 'panels',
    Icon: Layers,
    desc: '29 GA painted & galvalume',
  },
  {
    name: 'Doors & Hardware',
    slug: 'doors-hardware',
    Icon: DoorOpen,
    desc: 'Walk-in to 14×14 garage doors',
  },
  {
    name: 'Square Tubing',
    slug: 'square-tubing',
    Icon: Package,
    desc: '12 & 14 GA structural tubing',
  },
  {
    name: 'Trusses',
    slug: 'trusses',
    Icon: Home,
    desc: "18' to 30' span trusses",
  },
  {
    name: 'Anchors',
    slug: 'anchors',
    Icon: Anchor,
    desc: 'Asphalt, concrete & mobile home',
  },
  {
    name: 'Insulation',
    slug: 'insulation',
    Icon: Thermometer,
    desc: 'Rolls & bubble wrap insulation',
  },
]

export default function CategoryCards() {
  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-3 block">
            What We Carry
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Shop by Category
          </h2>
          <p className="text-muted-foreground mt-3 text-lg max-w-xl mx-auto">
            Everything for your metal building project in one place.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map(({ name, slug, Icon, desc }) => (
            <Link
              key={slug}
              href={`/products?cat=${slug}`}
              className="group flex flex-col items-center text-center p-5 rounded-xl border border-slate-200 bg-white hover:border-primary hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary transition-colors duration-200">
                <Icon className="w-6 h-6 text-primary group-hover:text-white transition-colors duration-200" />
              </div>
              <h3 className="font-semibold text-sm leading-tight mb-1 group-hover:text-primary transition-colors">
                {name}
              </h3>
              <p className="text-xs text-muted-foreground leading-tight">{desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
