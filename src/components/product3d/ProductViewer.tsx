'use client'

import dynamic from 'next/dynamic'
import { Move3d, Loader2 } from 'lucide-react'
import type { ProductLike } from './resolve'

// WebGL is client-only — load the canvas without SSR and show a skeleton meanwhile.
const ViewerCanvas = dynamic(() => import('./ViewerCanvas'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
    </div>
  ),
})

export default function ProductViewer({ product }: { product: ProductLike }) {
  return (
    <div className="relative aspect-square rounded-xl overflow-hidden bg-gradient-to-b from-slate-50 to-slate-200 border">
      <ViewerCanvas product={product} />
      {/* Interaction hint */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur text-xs text-slate-600 shadow-sm pointer-events-none">
        <Move3d className="w-3.5 h-3.5" />
        Drag to rotate · scroll to zoom
      </div>
    </div>
  )
}
