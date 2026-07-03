'use client'

import { Environment, Lightformer } from '@react-three/drei'

// Studio lighting + a fully procedural environment map (built from Lightformers, so
// nothing is fetched over the network — required by the app's strict setup) that
// gives the metal materials something to reflect. Rendered inside a <Canvas>.
export function Lights({ shadows = true, envResolution = 128 }: { shadows?: boolean; envResolution?: number }) {
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[5, 8, 6]}
        intensity={2.1}
        castShadow={shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0005}
      />
      <directionalLight position={[-6, 4, -4]} intensity={0.7} color="#cdd9ff" />
      <Environment resolution={envResolution} frames={1}>
        <color attach="background" args={['#0b0b0c']} />
        <Lightformer intensity={3} position={[0, 5, 2]} scale={[8, 8, 1]} />
        <Lightformer intensity={1.2} position={[-4, 2, -3]} scale={[4, 4, 1]} color="#bcd0ff" />
        <Lightformer intensity={1.2} position={[4, 1, 3]} scale={[4, 4, 1]} color="#fff2df" />
        <Lightformer intensity={0.8} position={[0, -4, 0]} scale={[8, 8, 1]} />
      </Environment>
    </>
  )
}
