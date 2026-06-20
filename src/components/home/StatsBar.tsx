'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

const stats = [
  { value: '57+', label: 'Products In Stock' },
  { value: '17', label: 'Product Categories' },
  { value: 'Same-Day', label: 'Order Processing' },
  { value: '100%', label: 'Quality Inspected' },
]

export default function StatsBar() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <section ref={ref} className="bg-white border-b border-slate-100 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 divide-x divide-slate-100">
          {stats.map(({ value, label }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 14 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1, ease: 'easeOut' }}
              className="text-center px-4 first:pl-0"
            >
              <div className="text-3xl sm:text-4xl font-extrabold text-primary mb-1 tracking-tight">
                {value}
              </div>
              <div className="text-sm text-muted-foreground font-medium">{label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
