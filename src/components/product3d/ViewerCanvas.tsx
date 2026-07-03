'use client'

import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Bounds, Center, ContactShadows, OrbitControls } from '@react-three/drei'
import { Lights } from './Scene'
import { ProductModel } from './models'
import { resolveModel, type ProductLike } from './resolve'
import { useConfigurator } from '@/store/configurator'

// The interactive product viewer used on the detail page: drag to orbit, scroll to
// zoom. Auto-rotates until the user grabs it. Recolors live from the configurator
// store (the order form writes the selected color there).
export default function ViewerCanvas({ product }: { product: ProductLike }) {
  const { archetype, params } = resolveModel(product)
  const storeColor = useConfigurator((s) => s.color)
  const [interacted, setInteracted] = useState(false)

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [3, 2, 4], fov: 40 }}
      gl={{ antialias: true, alpha: true }}
      onPointerDown={() => setInteracted(true)}
      onWheel={() => setInteracted(true)}
    >
      <Lights />
      <Bounds fit clip observe margin={1.2}>
        <Center>
          <ProductModel archetype={archetype} colorName={storeColor} params={params} />
        </Center>
      </Bounds>
      <ContactShadows position={[0, -1.15, 0]} opacity={0.35} scale={10} blur={2.4} far={4} resolution={512} />
      <OrbitControls
        makeDefault
        enablePan={false}
        autoRotate={!interacted}
        autoRotateSpeed={1.1}
        minDistance={2}
        maxDistance={12}
        enableDamping
      />
    </Canvas>
  )
}
