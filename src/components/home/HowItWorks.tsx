import { UserPlus, ShoppingCart, PackageCheck } from 'lucide-react'

const steps = [
  {
    number: '1',
    Icon: UserPlus,
    title: 'Create an Account',
    desc: 'Sign up free in seconds. No credit card required to browse our full catalog.',
  },
  {
    number: '2',
    Icon: ShoppingCart,
    title: 'Browse & Order Online',
    desc: 'Shop 57+ products, add to cart, and check out securely — any time of day.',
  },
  {
    number: '3',
    Icon: PackageCheck,
    title: 'Track & Receive',
    desc: 'Get real-time status updates as your order is processed, ready, and delivered.',
  },
]

export default function HowItWorks() {
  return (
    <section className="relative py-24 bg-slate-950 overflow-hidden">
      {/* Pattern */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-xs font-semibold uppercase tracking-widest text-orange-400 mb-3 block">
            How It Works
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Get your materials in 3 steps
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-10 relative">
          {/* Connector line (desktop only) */}
          <div className="hidden md:block absolute top-[2.2rem] left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-px bg-gradient-to-r from-white/5 via-orange-500/40 to-white/5" />

          {steps.map(({ number, Icon, title, desc }) => (
            <div key={number} className="relative flex flex-col items-center text-center">
              {/* Icon circle */}
              <div className="relative w-[72px] h-[72px] rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center mb-6">
                <Icon className="w-7 h-7 text-orange-400" />
                <span className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center shadow-lg">
                  {number}
                </span>
              </div>
              <h3 className="text-white font-semibold text-lg mb-3">{title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed max-w-xs">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
