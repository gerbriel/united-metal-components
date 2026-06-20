'use client'

import { motion } from 'framer-motion'
import { ArrowRight, ShieldCheck, Truck, Award, Star } from 'lucide-react'
import { ButtonLink } from '@/components/ui/button-link'

function FadeUp({ delay = 0, children }: { delay?: number; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

export default function HeroSection() {
  return (
    <section className="relative bg-slate-950 overflow-hidden">
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />
      {/* Orange glow bottom-right */}
      <div className="absolute bottom-0 right-0 w-2/3 h-2/3 bg-orange-500/8 rounded-full blur-[140px] pointer-events-none" />
      {/* Blue glow top-left */}
      <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 lg:py-36">
        <div className="max-w-4xl">

          {/* Eyebrow */}
          <FadeUp delay={0}>
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase bg-orange-500/15 text-orange-400 border border-orange-500/20 mb-8">
              <ShieldCheck className="w-3.5 h-3.5" />
              Premium Metal Building Components
            </span>
          </FadeUp>

          {/* Headline */}
          <FadeUp delay={0.13}>
            <h1 className="text-4xl sm:text-5xl lg:text-[72px] font-extrabold text-white leading-[1.05] tracking-tight mb-6">
              Built for the{' '}
              <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-orange-400 bg-clip-text text-transparent">
                toughest jobs
              </span>
              <br className="hidden sm:block" />
              {' '}in construction.
            </h1>
          </FadeUp>

          {/* Sub */}
          <FadeUp delay={0.26}>
            <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed">
              Sheet metal panels, carport kits, garage doors, structural tubing, and trusses — everything for your metal building project, with real-time order tracking.
            </p>
          </FadeUp>

          {/* CTAs */}
          <FadeUp delay={0.38}>
            <div className="flex flex-wrap gap-4 mb-14">
              <ButtonLink
                href="/products"
                size="lg"
                className="bg-orange-500 hover:bg-orange-600 text-white border-0 shadow-xl shadow-orange-500/30 h-12 px-7 text-base font-semibold"
              >
                Shop All Products
                <ArrowRight className="ml-2 w-5 h-5" />
              </ButtonLink>
              <ButtonLink
                href="/contact"
                size="lg"
                variant="outline"
                className="border-white/15 text-white hover:bg-white/8 h-12 px-7 text-base"
              >
                Get a Quote
              </ButtonLink>
            </div>
          </FadeUp>

          {/* Trust strip */}
          <FadeUp delay={0.5}>
            <div className="flex flex-wrap gap-x-8 gap-y-3 pt-10 border-t border-white/8">
              {[
                { Icon: ShieldCheck, label: 'Quality Guaranteed' },
                { Icon: Truck, label: 'Fast Delivery' },
                { Icon: Award, label: 'Industry Trusted' },
                { Icon: Star, label: '5-Star Rated' },
              ].map(({ Icon, label }) => (
                <span key={label} className="flex items-center gap-2 text-sm text-slate-500">
                  <Icon className="w-4 h-4 text-orange-400/80" />
                  {label}
                </span>
              ))}
            </div>
          </FadeUp>
        </div>
      </div>
    </section>
  )
}
