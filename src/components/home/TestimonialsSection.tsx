'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react'

const testimonials = [
  {
    name: 'Mike Rodriguez',
    role: 'General Contractor',
    company: 'Rodriguez Construction',
    content:
      "United Metal has been my go-to supplier for three years. Consistent quality, fast delivery, and their online ordering system makes reordering a breeze.",
    rating: 5,
    initial: 'MR',
  },
  {
    name: 'Sarah Chen',
    role: 'DIY Builder',
    company: 'Homeowner',
    content:
      "I built my first carport using their kit and the experience was outstanding. Being able to track my order online and get notifications was a huge plus.",
    rating: 5,
    initial: 'SC',
  },
  {
    name: 'James Thurston',
    role: 'Farm Operations Manager',
    company: 'Thurston Farms',
    content:
      "We've ordered everything from trusses to garage doors through their site. Consistent quality, great prices, and the team actually knows their products.",
    rating: 5,
    initial: 'JT',
  },
]

export default function TestimonialsSection() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setActive((a) => (a + 1) % testimonials.length)
    }, 5500)
    return () => clearInterval(id)
  }, [])

  const t = testimonials[active]

  return (
    <section className="py-24 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <span className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-3 block">
          Customer Stories
        </span>
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-16">
          Trusted by builders across the region
        </h2>

        <div className="relative min-h-[260px] flex flex-col items-center justify-center">
          <Quote className="w-10 h-10 text-orange-200 mb-6 rotate-180" />

          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.45, ease: 'easeInOut' }}
              className="w-full"
            >
              <div className="flex justify-center gap-1 mb-5">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-orange-400 fill-orange-400" />
                ))}
              </div>

              <blockquote className="text-xl text-foreground font-medium leading-relaxed mb-7 max-w-2xl mx-auto">
                "{t.content}"
              </blockquote>

              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white text-sm font-semibold mb-2">
                  {t.initial}
                </div>
                <p className="font-semibold text-foreground">{t.name}</p>
                <p className="text-sm text-muted-foreground">
                  {t.role}, {t.company}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 mt-10">
          <button
            onClick={() => setActive((a) => (a - 1 + testimonials.length) % testimonials.length)}
            className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center hover:border-primary hover:text-primary transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex gap-2">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                aria-label={`Testimonial ${i + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === active ? 'bg-primary w-6' : 'bg-slate-300 w-2'
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => setActive((a) => (a + 1) % testimonials.length)}
            className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center hover:border-primary hover:text-primary transition-colors"
            aria-label="Next"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  )
}
