import Link from 'next/link'
import { NAV_CATEGORIES } from '@/lib/nav-categories'

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

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {NAV_CATEGORIES.map(({ label, slug, Icon, desc }) => (
            <Link
              key={slug}
              href={`/products?cat=${slug}`}
              className="group flex flex-col items-center text-center p-5 rounded-xl border border-slate-200 bg-white hover:border-primary hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary transition-colors duration-200">
                <Icon className="w-6 h-6 text-primary group-hover:text-white transition-colors duration-200" />
              </div>
              <h3 className="font-semibold text-sm leading-tight mb-1 group-hover:text-primary transition-colors">
                {label}
              </h3>
              <p className="text-xs text-muted-foreground leading-tight">{desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
