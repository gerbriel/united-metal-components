'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Package } from 'lucide-react'
import type { ProductLike } from './resolve'

const ThumbCanvas = dynamic(() => import('./ThumbCanvas'), { ssr: false })

// Grid thumbnail: only mounts a live WebGL canvas while the card is near the
// viewport (IntersectionObserver), and unmounts it once well off-screen — so a long
// catalog never exceeds the browser's WebGL context budget. Off-screen / pre-mount
// shows the same icon placeholder as before.
export default function ProductThumb({ product }: { product: ProductLike }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: '200px 0px', threshold: 0.01 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={ref} className="w-full h-full">
      {visible ? (
        <ThumbCanvas product={product} />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Package className="w-10 h-10 text-slate-300" />
        </div>
      )}
    </div>
  )
}
