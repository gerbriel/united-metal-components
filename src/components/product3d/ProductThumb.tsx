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
//
// The unmount is DEFERRED by a short delay: R3F initializes the canvas
// asynchronously (`await gl.configure()` → `onCreated` → connect events to the
// canvas div). If the card scrolls out and unmounts during that async gap, R3F
// connects to a now-null ref and throws
// ("Cannot read properties of null (reading 'addEventListener')"), leaving the
// thumbnail blank. Lingering keeps the canvas mounted long enough for init to
// finish, and also collapses fast scroll-through churn.
const UNMOUNT_DELAY_MS = 800

export default function ProductThumb({ product, colorName }: { product: ProductLike; colorName?: string | null }) {
  const ref = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let hideTimer: ReturnType<typeof setTimeout> | undefined
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (hideTimer) clearTimeout(hideTimer)
          setMounted(true)
        } else {
          if (hideTimer) clearTimeout(hideTimer)
          hideTimer = setTimeout(() => setMounted(false), UNMOUNT_DELAY_MS)
        }
      },
      { rootMargin: '200px 0px', threshold: 0.01 },
    )
    io.observe(el)
    return () => {
      if (hideTimer) clearTimeout(hideTimer)
      io.disconnect()
    }
  }, [])

  return (
    <div ref={ref} className="w-full h-full">
      {mounted ? (
        <ThumbCanvas product={product} colorName={colorName} />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Package className="w-10 h-10 text-slate-300" />
        </div>
      )}
    </div>
  )
}
