// Throwaway screenshot harness for the asphalt-anchor viewer model (bundled with
// esbuild, driven by Playwright). Delete after use.
import React from 'react'
import { createRoot } from 'react-dom/client'
import { Canvas } from '@react-three/fiber'
import { Bounds, Center, OrbitControls } from '@react-three/drei'
import { Lights } from './src/components/product3d/Scene'
import { ProductModel } from './src/components/product3d/models'

const q = new URLSearchParams(location.search)
const mode = q.get('mode') ?? 'fit'
const cam = (q.get('cam') ?? '3,2,4').split(',').map(Number)
const tgt = (q.get('tgt') ?? '0,0,0').split(',').map(Number)

function App() {
  return (
    <Canvas
      shadows
      dpr={1}
      camera={{ position: cam, fov: 40 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      onCreated={({ gl }) => gl.setClearColor('#f4f4f5', 1)}
    >
      <Lights />
      {mode === 'fit' ? (
        <Bounds fit clip margin={1.2}>
          <Center>
            <ProductModel archetype="asphalt-anchor" />
          </Center>
        </Bounds>
      ) : (
        <Center>
          <ProductModel archetype="asphalt-anchor" />
        </Center>
      )}
      <OrbitControls makeDefault target={tgt} />
    </Canvas>
  )
}

createRoot(document.getElementById('root')).render(<App />)
let frames = 0
;(function tick() {
  frames++
  if (frames > 40) window.__done = true
  else requestAnimationFrame(tick)
})()
