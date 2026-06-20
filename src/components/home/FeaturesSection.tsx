import { ShieldCheck, Truck, Zap, Headphones } from 'lucide-react'

const features = [
  {
    Icon: ShieldCheck,
    title: 'Quality You Can Trust',
    desc: 'Every product is sourced from certified manufacturers and inspected before it leaves our facility.',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    accent: 'group-hover:border-blue-200',
  },
  {
    Icon: Truck,
    title: 'Fast, Reliable Delivery',
    desc: 'Same-day order processing with tracking updates delivered directly to you — no chasing down status.',
    iconBg: 'bg-orange-50',
    iconColor: 'text-orange-600',
    accent: 'group-hover:border-orange-200',
  },
  {
    Icon: Zap,
    title: 'Order Online 24/7',
    desc: 'Place and track orders any time from any device. No phone tag, no waiting — just real-time status.',
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    accent: 'group-hover:border-violet-200',
  },
  {
    Icon: Headphones,
    title: 'Expert Support',
    desc: 'Our team knows metal buildings. We help you spec the right materials for your exact project.',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    accent: 'group-hover:border-emerald-200',
  },
]

export default function FeaturesSection() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-3 block">
            Why Choose Us
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Everything your project needs
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            From single sheets to complete carport kits, we supply professional contractors and DIY builders across the region.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map(({ Icon, title, desc, iconBg, iconColor, accent }) => (
            <div
              key={title}
              className={`group relative p-6 rounded-2xl border border-slate-100 bg-white hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 ${accent}`}
            >
              <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center mb-4`}>
                <Icon className={`w-5 h-5 ${iconColor}`} />
              </div>
              <h3 className="font-semibold text-base mb-2 text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
