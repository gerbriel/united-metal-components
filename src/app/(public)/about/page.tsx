import type { Metadata } from 'next'
import { MapPin, Phone, Mail, Clock, Award, Users, Package, ShieldCheck } from 'lucide-react'
import { ButtonLink } from '@/components/ui/button-link'

export const metadata: Metadata = {
  title: 'About Us | United Metal Components',
  description: 'Fresno-based supplier of premium metal building materials including sheet metal panels, trusses, carport kits, and garage doors.',
}

const values = [
  {
    Icon: Award,
    title: 'Quality First',
    desc: 'Every product is sourced from certified manufacturers and inspected before it leaves our facility.',
  },
  {
    Icon: Users,
    title: 'Built for Builders',
    desc: 'From independent contractors to large construction crews, we understand what you need and how fast you need it.',
  },
  {
    Icon: Package,
    title: 'Full Inventory',
    desc: 'Panels, trusses, doors, tubing, anchors, insulation — everything for your metal building project in one place.',
  },
  {
    Icon: ShieldCheck,
    title: 'Honest Pricing',
    desc: 'Transparent per-unit pricing with no hidden fees. What you see is what you pay.',
  },
]

export default function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-slate-950 text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-orange-400 mb-4 block">
            About Us
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-5 leading-tight">
            Fresno&apos;s metal building materials supplier
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            United Metal Components supplies contractors, builders, and property owners across the Central Valley with premium sheet metal panels, structural components, and complete carport kits — available for pickup at our Fresno facility.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-3 block">
                Our Story
              </span>
              <h2 className="text-3xl font-bold mb-5">Serving the Central Valley</h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  United Metal Components was founded to solve a simple problem: builders in the Fresno area needed a reliable, local source for quality metal building materials without the long lead times or inconsistent quality of big-box suppliers.
                </p>
                <p>
                  We carry the full range of components you need — from 29-gauge sheet metal panels and structural square tubing to trusses, anchors, garage doors, and insulation. Everything is stocked locally and available for same-day pickup.
                </p>
                <p>
                  Whether you&apos;re a professional contractor building a carport for a client or a homeowner adding a metal storage structure to your property, we have the materials and the expertise to help you get it done right.
                </p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-2xl p-8 space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm mb-0.5">Our Location</p>
                  <p className="text-sm text-muted-foreground">9191 W Whitesbridge Ave<br />Fresno, CA 93706</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm mb-0.5">Pickup Hours</p>
                  <p className="text-sm text-muted-foreground">
                    Monday – Friday: 7:00 AM – 5:00 PM<br />
                    Saturday: 8:00 AM – 12:00 PM<br />
                    Sunday: Closed
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm mb-0.5">Phone</p>
                  <a href="tel:+15595555555" className="text-sm text-orange-500 hover:text-orange-600">(559) 555-5555</a>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm mb-0.5">Email</p>
                  <a href="mailto:info@unitedmetalcomponents.com" className="text-sm text-orange-500 hover:text-orange-600">
                    info@unitedmetalcomponents.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">What we stand for</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map(({ Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl border border-slate-100 p-6">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary text-center">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Ready to order?</h2>
          <p className="text-white/60 mb-8">Browse our full catalog and place your order online for pickup at our Fresno location.</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <ButtonLink href="/products" size="lg" className="bg-orange-500 hover:bg-orange-600 text-white border-0">
              Browse Products
            </ButtonLink>
            <ButtonLink href="/contact" size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10">
              Contact Us
            </ButtonLink>
          </div>
        </div>
      </section>
    </div>
  )
}
