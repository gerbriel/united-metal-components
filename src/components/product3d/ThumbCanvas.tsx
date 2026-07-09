'use client'

import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Center, Resize } from '@react-three/drei'
import * as THREE from 'three'
import { Lights } from './Scene'
import { ProductModel } from './models'
import { resolveModel, type ProductLike } from './resolve'

// A slowly auto-rotating group holding the fit-to-unit model. Rotation is applied
// OUTSIDE <Resize>/<Center> so the fit is measured once and never churns.
// `colorName` (optional) tints the model — used by overstock cards to render each
// piece in its own finish; omitted for the plain catalog thumbnails.
function Spinner({ product, colorName }: { product: ProductLike; colorName?: string | null }) {
  const ref = useRef<THREE.Group>(null)
  const { archetype, params } = resolveModel(product)
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.55
  })
  return (
    <group ref={ref}>
      <Center>
        <Resize>
          <ProductModel archetype={archetype} colorName={colorName} params={params} />
        </Resize>
      </Center>
    </group>
  )
}

// Lightweight thumbnail canvas: plain 3-point lighting (no per-canvas environment
// map) so a page full of these stays cheap. Non-interactive by design.
export default function ThumbCanvas({ product, colorName }: { product: ProductLike; colorName?: string | null }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [1.4, 1.0, 1.55], fov: 34 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
    >
      {/* Low-res procedural environment so the metal reads as metal (not black),
          but cheap enough to run on many thumbnails at once. No shadows here. */}
      <Lights shadows={false} envResolution={64} />
      <Spinner product={product} colorName={colorName} />
    </Canvas>
  )
}
