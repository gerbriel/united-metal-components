import { ArrowRight, ClipboardList } from 'lucide-react'
import { ButtonLink } from '@/components/ui/button-link'

export default function CtaBanner() {
  return (
    <section className="relative py-24 bg-primary overflow-hidden">
      {/* Pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      {/* Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-white/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center mx-auto mb-7">
          <ClipboardList className="w-6 h-6 text-orange-400" />
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5 leading-tight">
          Ready to start your project?
        </h2>
        <p className="text-lg text-white/60 mb-10 max-w-2xl mx-auto leading-relaxed">
          Create a free account to place orders, track your delivery, and get notified the moment your materials are ready.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <ButtonLink
            href="/signup"
            size="lg"
            className="bg-orange-500 hover:bg-orange-600 text-white border-0 shadow-xl shadow-black/25 h-12 px-8 text-base font-semibold"
          >
            Create Free Account
            <ArrowRight className="ml-2 w-5 h-5" />
          </ButtonLink>
          <ButtonLink
            href="/products"
            size="lg"
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10 h-12 px-8 text-base"
          >
            Browse Products
          </ButtonLink>
        </div>
      </div>
    </section>
  )
}
