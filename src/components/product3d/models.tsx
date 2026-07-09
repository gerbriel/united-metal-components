'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import {
  ribbonShape,
  extrudeProfile,
  l5Center,
  L5_RIB_H,
  splitUnderside,
  bubbleTexture,
  colorHex,
  steelMaterialProps,
  isMetallicFinish,
  screwThreadGeometry,
  drillPointGeometry,
} from './geom'
import type { Archetype } from './resolve'

// Shared prop shape: every model receives the resolved finish color (by name) and
// any parsed params (tube size, door W×H, …).
interface ModelProps {
  colorName?: string | null
  params?: Record<string, number>
}

// Painted / bare steel material props for the current finish.
function useSteel(colorName?: string | null, fallbackHex?: string) {
  return useMemo(
    () => ({ color: colorHex(colorName, fallbackHex), ...steelMaterialProps(colorName) }),
    [colorName, fallbackHex],
  )
}

// Tube stock (square tubing, base rail, truss members): bare tube is a light
// zinc-grey. Its long flat faces mirror the dark env backdrop at full metalness,
// so galvanized tube gets a duller, partly diffuse finish (hot-dip zinc is matte)
// that stays light under the key lights instead of reading black.
function useTubeSteel(colorName?: string | null) {
  const steel = useSteel(colorName, '#bfc4c9')
  return isMetallicFinish(colorName)
    ? { ...steel, metalness: 0.7, roughness: 0.3, envMapIntensity: 2.2 }
    : steel
}

// ── Square tubing / inserts ─────────────────────────────────────────────────────
// Hollow square section (open ends read as a real tube), laid along X.
function SquareTube({ colorName, params }: ModelProps) {
  const sizeIn = params?.size ?? 2.25
  const s = sizeIn / 12          // face width, ft
  const wall = 0.014             // ~0.17" wall
  const len = Math.max(2.2, s * 12)
  const geo = useMemo(() => {
    const h = s / 2
    const shape = new THREE.Shape()
    shape.moveTo(-h, -h); shape.lineTo(h, -h); shape.lineTo(h, h); shape.lineTo(-h, h); shape.closePath()
    const ih = h - wall
    const hole = new THREE.Path()
    hole.moveTo(-ih, -ih); hole.lineTo(ih, -ih); hole.lineTo(ih, ih); hole.lineTo(-ih, ih); hole.closePath()
    shape.holes.push(hole)
    return extrudeProfile(shape, len)
  }, [s, len])
  const steel = useTubeSteel(colorName)
  return <mesh geometry={geo} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow><meshStandardMaterial {...steel} side={THREE.DoubleSide} /></mesh>
}

// ── Rectangular base rail ───────────────────────────────────────────────────────
function BaseRail({ colorName }: ModelProps) {
  const w = 2.5 / 12, t = 1.5 / 12, len = 3.2, wall = 0.016
  const geo = useMemo(() => {
    const hw = w / 2, ht = t / 2
    const shape = new THREE.Shape()
    shape.moveTo(-hw, -ht); shape.lineTo(hw, -ht); shape.lineTo(hw, ht); shape.lineTo(-hw, ht); shape.closePath()
    const hole = new THREE.Path()
    hole.moveTo(-hw + wall, -ht + wall); hole.lineTo(hw - wall, -ht + wall)
    hole.lineTo(hw - wall, ht - wall); hole.lineTo(-hw + wall, ht - wall); hole.closePath()
    shape.holes.push(hole)
    return extrudeProfile(shape, len)
  }, [])
  const steel = useTubeSteel(colorName)
  return <mesh geometry={geo} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow><meshStandardMaterial {...steel} side={THREE.DoubleSide} /></mesh>
}

// ── Sheet-metal panel (L5 profile) ──────────────────────────────────────────────
// A full 36"-coverage L5 sheet: five ¾" major ribs on 9" centers (one at each edge
// for the side lap) with paired stiffener ribs across every pan. Painted sheets
// show the off-white backer coat on the underside; galvalume/bare stays uniform.
const PANEL_BACKER = { color: '#EDEAE0', metalness: 0.35, roughness: 0.55 }

function Panel({ colorName }: ModelProps) {
  const len = 5
  const geo = useMemo(
    () => splitUnderside(extrudeProfile(ribbonShape(l5Center(5), 0.02), len)),
    [],
  )
  const steel = useSteel(colorName, '#c8c8c0')
  // Galvalume (and no-color/bare) sheets are the same metal on both faces; every
  // painted color gets the off-white backer underneath.
  const painted = !!colorName && !colorName.toLowerCase().includes('galvalume')
  const under = painted ? PANEL_BACKER : steel
  return (
    <mesh geometry={geo} castShadow receiveShadow>
      <meshStandardMaterial attach="material-0" {...steel} side={THREE.DoubleSide} />
      <meshStandardMaterial attach="material-1" {...under} side={THREE.DoubleSide} />
    </mesh>
  )
}

// ── Skylight panel (translucent white polycarbonate, same L5 profile) ────────────
// Always white plastic — ignores the finish color entirely.
function Skylight() {
  const len = 5
  const geo = useMemo(() => extrudeProfile(ribbonShape(l5Center(5), 0.02), len), [])
  return (
    <mesh geometry={geo} castShadow receiveShadow>
      <meshPhysicalMaterial
        color="#f7f8f5"
        metalness={0}
        roughness={0.22}
        clearcoat={0.7}
        clearcoatRoughness={0.25}
        transparent
        opacity={0.65}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

// ── Trim: folded sheet profiles (extruded along their run) ──────────────────────
function extrudedTrim(center: [number, number][], len: number, thickness = 0.02) {
  return extrudeProfile(ribbonShape(center, thickness), len)
}

function TrimL({ colorName }: ModelProps) {
  const F = 4 / 12, len = 4
  const geo = useMemo(() => extrudedTrim([[F, 0], [0, 0], [0, F]], len), [])
  const steel = useSteel(colorName)
  return <mesh geometry={geo} castShadow receiveShadow><meshStandardMaterial {...steel} side={THREE.DoubleSide} /></mesh>
}

function TrimJ({ colorName }: ModelProps) {
  // J-channel: deep back leg, bottom, short front return lip.
  const D = 2 / 12, W = 1.4 / 12, lip = 0.7 / 12, len = 4
  const geo = useMemo(() => extrudedTrim([[0, D], [0, 0], [W, 0], [W, lip]], len), [])
  const steel = useSteel(colorName)
  return <mesh geometry={geo} castShadow receiveShadow><meshStandardMaterial {...steel} side={THREE.DoubleSide} /></mesh>
}

function TrimCorner({ colorName }: ModelProps) {
  // Outside corner: two 3" faces at 90° each ending in a small return hem.
  const F = 3 / 12, H = 0.7 / 12, k = 0.7, len = 4
  const geo = useMemo(
    () => extrudedTrim([[F - H * k, H * k], [F, 0], [0, 0], [0, F], [H * k, F - H * k]], len),
    [],
  )
  const steel = useSteel(colorName)
  return <mesh geometry={geo} castShadow receiveShadow><meshStandardMaterial {...steel} side={THREE.DoubleSide} /></mesh>
}

function TrimSideVert({ colorName }: ModelProps) {
  // Side vertical trim: a wide face with two folded return legs (channel over the edge).
  const face = 3.5 / 12, leg = 1.1 / 12, len = 4
  const geo = useMemo(
    () => extrudedTrim([[leg, -leg], [0, 0], [0, face], [leg, face + leg * 0]], len),
    [],
  )
  const steel = useSteel(colorName)
  return <mesh geometry={geo} castShadow receiveShadow><meshStandardMaterial {...steel} side={THREE.DoubleSide} /></mesh>
}

function TrimFlashing({ colorName }: ModelProps) {
  // Step flashing: a wide flat pan with a bent-up back leg and a small front drip.
  const W = 6 / 12, up = 1.6 / 12, drip = 0.9 / 12, len = 4
  const geo = useMemo(
    () => extrudedTrim([[-drip * 0.6, -drip], [0, 0], [W, 0], [W, up]], len),
    [],
  )
  const steel = useSteel(colorName)
  return <mesh geometry={geo} castShadow receiveShadow><meshStandardMaterial {...steel} side={THREE.DoubleSide} /></mesh>
}

function TrimBoxEve({ colorName }: ModelProps) {
  // Boxed eave cap (from the Carports profile): top flat, outer face, bottom return, drip.
  const H = 0.46, WT = 0.26, WB = 0.38, HK = 0.12, len = 4
  const geo = useMemo(
    () => extrudedTrim([[WT, H], [0, H], [0, 0], [WB, 0], [WB + HK * 0.6, -HK]], len, 0.024),
    [],
  )
  const steel = useSteel(colorName)
  return <mesh geometry={geo} castShadow receiveShadow><meshStandardMaterial {...steel} side={THREE.DoubleSide} /></mesh>
}

function RidgeCap({ colorName }: ModelProps) {
  // 14" strip bent to a peak (≈18° each slope) with a drip leg at each edge.
  const theta = (18 * Math.PI) / 180
  const W = (14 / 12 - 2 * 0.06) / 2, hem = 0.06, len = 4.5
  const geo = useMemo(() => {
    const cz = Math.cos(theta), sz = Math.sin(theta)
    const lwe: [number, number] = [-W * cz, -W * sz]
    const rwe: [number, number] = [W * cz, -W * sz]
    const center: [number, number][] = [
      [lwe[0], lwe[1] - hem], lwe, [0, 0], rwe, [rwe[0], rwe[1] - hem],
    ]
    return extrudedTrim(center, len, 0.024)
  }, [])
  const steel = useSteel(colorName)
  return <mesh geometry={geo} castShadow receiveShadow><meshStandardMaterial {...steel} side={THREE.DoubleSide} /></mesh>
}

function HatChannel({ colorName }: ModelProps) {
  // Top-hat section: two bottom flanges, two walls, a raised top web.
  const f = 1.2 / 12, w = 1.5 / 12, h = 1.0 / 12, len = 4.5
  const geo = useMemo(
    () => extrudedTrim([[-(w + f), 0], [-w, 0], [-w, h], [w, h], [w, 0], [w + f, 0]], len, 0.01),
    [],
  )
  const steel = useSteel(colorName)
  return <mesh geometry={geo} castShadow receiveShadow><meshStandardMaterial {...steel} side={THREE.DoubleSide} /></mesh>
}

// ── C-channel brace ─────────────────────────────────────────────────────────────
// Formed C-section (a web with two same-side flanges) — the "c channel" knee brace,
// NOT a hollow tube. Drawn as a `[` centerline and extruded along its run, then laid
// along X like the tubing so it reads as a length of channel.
function Brace({ colorName }: ModelProps) {
  const web = 3 / 12, flange = 1.5 / 12, th = 0.01, len = 3.0
  const geo = useMemo(() => {
    const hw = web / 2
    // top-flange tip → web top → web bottom → bottom-flange tip
    return extrudeProfile(ribbonShape([[flange, hw], [0, hw], [0, -hw], [flange, -hw]], th), len)
  }, [])
  const steel = useSteel(colorName)
  return <mesh geometry={geo} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow><meshStandardMaterial {...steel} side={THREE.DoubleSide} /></mesh>
}

// ── Square plate ────────────────────────────────────────────────────────────────
// Flat 9" square steel plate (base/gusset plate). Same sheet color and gauge as the
// hat channel / brace; drawn as a thin flat slab laid flat so the square face reads.
function Plate({ colorName }: ModelProps) {
  const side = 9 / 12, th = 0.01   // 9" square, same gauge as the hat channel / brace
  const steel = useSteel(colorName)
  return (
    <mesh castShadow receiveShadow>
      <boxGeometry args={[side, th, side]} /><meshStandardMaterial {...steel} />
    </mesh>
  )
}

// ── L-bracket ───────────────────────────────────────────────────────────────────
function LBracket() {
  const leg = 0.5, th = 0.01, wide = 0.42   // thin galvanized angle bracket, no holes
  const silver = SCREW_ZINC
  return (
    <group>
      <mesh position={[leg / 2, th / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[leg, th, wide]} /><meshStandardMaterial {...silver} />
      </mesh>
      <mesh position={[th / 2, leg / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[th, leg, wide]} /><meshStandardMaterial {...silver} />
      </mesh>
    </group>
  )
}

// ── Rebar anchor (ribbed rod, dark matte silver, hex nut welded to the top end as
// the driving head — ignores finish color) ──────────────────────────────────────
function Rebar() {
  const len = 4, r = 0.06
  const mat = { color: '#63686d', metalness: 0.5, roughness: 0.8 }
  const weldMat = { color: '#4b4f53', metalness: 0.45, roughness: 0.9 }
  return (
    <group rotation={[0, 0, Math.PI / 2]}>
      <mesh castShadow receiveShadow><cylinderGeometry args={[r, r, len, 20]} /><meshStandardMaterial {...mat} /></mesh>
      {Array.from({ length: 22 }).map((_, i) => (
        <mesh key={i} position={[0, -len / 2 + (i + 0.5) * (len / 22), 0]} rotation={[0, 0, 0.5]}>
          <torusGeometry args={[r + 0.008, 0.012, 6, 16]} /><meshStandardMaterial {...mat} />
        </mesh>
      ))}
      {/* hex nut welded flush to the top end */}
      <mesh position={[0, len / 2 - 0.06, 0]} castShadow>
        <cylinderGeometry args={[0.115, 0.115, 0.12, 6]} /><meshStandardMaterial {...mat} flatShading />
      </mesh>
      {/* weld bead where the nut meets the rod */}
      <mesh position={[0, len / 2 - 0.13, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[r + 0.018, 0.026, 8, 24]} /><meshStandardMaterial {...weldMat} />
      </mesh>
    </group>
  )
}

// ── 12-14 × 1" Hex Washer Head Self-Drilling Screw ──────────────────────────────
// Two variants share one bright-ZINC lower half — a REAL swept helical thread
// (TubeGeometry along a helix, not stacked rings) over the core shaft, an unthreaded
// round shank, then a flattened self-drilling (Tek) drill point:
//   • Screw     — WITH bonded EPDM sealing washer: painted hex washer head + colored
//                 rubber washer (panel colors; white default).
//   • ScrewBare — WITHOUT washer: bare-zinc hex washer head, no color, no rubber.
const SCREW_ZINC = { color: '#d3d7db', metalness: 0.82, roughness: 0.38 }

function ScrewLower() {
  const r = 0.065   // thread root / shaft radius
  // Sharp V-profile helical thread — a thin triangular fin swept along the helix
  // (8 turns over the run, crest well proud of the root, gap between crests).
  const thread = useMemo(() => screwThreadGeometry(r, 0.118, 0.52, 8, 0.026), [])
  // TEK #3 point per the close-up reference: a LONG double-D pilot (cylinder with
  // two milled flats), an almond-shaped gash scooped into each flat, and a SHORT
  // sharp pyramid grind at the end.
  const point = useMemo(() => drillPointGeometry(0.058, 0.22, 0.075, 64, 56, 0.72, 0.45, 0), [])
  return (
    <>
      {/* core shaft (stops higher — the drill point owns more of the length) */}
      <mesh position={[0, 0.58, 0]} castShadow>
        <cylinderGeometry args={[r, r, 0.56, 28]} /><meshStandardMaterial {...SCREW_ZINC} />
      </mesh>
      {/* helical V-thread */}
      <mesh geometry={thread} position={[0, 0.57, 0]} castShadow>
        <meshStandardMaterial {...SCREW_ZINC} side={THREE.DoubleSide} />
      </mesh>
      {/* taper from the shaft into the drill pilot */}
      <mesh position={[0, 0.28, 0]} castShadow>
        <cylinderGeometry args={[r, 0.058, 0.04, 24]} /><meshStandardMaterial {...SCREW_ZINC} />
      </mesh>
      {/* drill point (long flatted pilot, short pyramid tip) */}
      <mesh geometry={point} position={[0, 0.04, 0]} castShadow>
        <meshStandardMaterial {...SCREW_ZINC} side={THREE.DoubleSide} />
      </mesh>
    </>
  )
}

// Hex washer head: a tall, crisp 6-flat hex (flat-shaded so the facets read) with a
// chamfered top edge, sitting DIRECTLY on a thin wide integral washer flange with a
// small underside bevel — no bulky cone between them. `mat` colors head + flange.
function HexWasherHead({ mat }: { mat: Record<string, unknown> }) {
  return (
    <>
      {/* hex head — crisp flats */}
      <mesh position={[0, 1.0, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 0.17, 6]} /><meshStandardMaterial {...mat} flatShading />
      </mesh>
      {/* chamfered top edge */}
      <mesh position={[0, 1.098, 0]} castShadow>
        <cylinderGeometry args={[0.112, 0.15, 0.026, 6]} /><meshStandardMaterial {...mat} flatShading />
      </mesh>
      {/* thin, wide integral washer flange directly under the hex */}
      <mesh position={[0, 0.898, 0]} castShadow>
        <cylinderGeometry args={[0.235, 0.235, 0.034, 44]} /><meshStandardMaterial {...mat} />
      </mesh>
      {/* flange underside bevel */}
      <mesh position={[0, 0.874, 0]} castShadow>
        <cylinderGeometry args={[0.235, 0.195, 0.014, 44]} /><meshStandardMaterial {...mat} />
      </mesh>
    </>
  )
}

function Screw({ colorName }: ModelProps) {
  const headHex = colorHex(colorName, '#F2F2F0')          // painted head/flange (panel colors)
  const painted = { color: headHex, metalness: 0.25, roughness: 0.5 }
  const epdm = { color: '#2b2d30', metalness: 0.0, roughness: 0.95 }  // dark bonded neoprene/EPDM
  return (
    <group rotation={[0, 0, Math.PI * 0.12]}>
      <HexWasherHead mat={painted} />
      {/* bright metal backing washer */}
      <mesh position={[0, 0.856, 0]} castShadow>
        <cylinderGeometry args={[0.205, 0.205, 0.022, 44]} /><meshStandardMaterial {...SCREW_ZINC} />
      </mesh>
      {/* bonded EPDM sealing washer (dark rubber) */}
      <mesh position={[0, 0.818, 0]} castShadow>
        <cylinderGeometry args={[0.175, 0.16, 0.054, 44]} /><meshStandardMaterial {...epdm} />
      </mesh>
      <ScrewLower />
    </group>
  )
}

function ScrewBare() {
  return (
    <group rotation={[0, 0, Math.PI * 0.12]}>
      <HexWasherHead mat={SCREW_ZINC} />
      <ScrewLower />
    </group>
  )
}

// ── Concrete wedge anchor (Strong-Tie style stud anchor) ────────────────────────
// Zinc stud: chamfered threaded top with hex nut + flat washer, long smooth shank,
// and the working end — a slitted expansion CLIP riding on a flared wedge mandrel
// at the very bottom (the part that bites the concrete).
function WedgeAnchor({ params }: ModelProps) {
  const inches = params?.len ?? 7
  const L = 0.9 + inches * 0.09          // representative: 5" → 1.35, 7" → 1.53
  const r = 0.05
  const top = L / 2, bot = -L / 2
  const threadLen = 0.5
  const thread = useMemo(() => screwThreadGeometry(r, 0.068, threadLen, 11, 0.017), [])
  return (
    <group rotation={[0, 0, Math.PI * 0.38]}>
      {/* stud */}
      <mesh position={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[r, r, L, 24]} /><meshStandardMaterial {...SCREW_ZINC} />
      </mesh>
      {/* chamfered top end (dome-chamfer so the nut starts easily) */}
      <mesh position={[0, top + 0.014, 0]} castShadow>
        <cylinderGeometry args={[r * 0.7, r, 0.03, 24]} /><meshStandardMaterial {...SCREW_ZINC} />
      </mesh>
      {/* thread run below the top */}
      <mesh geometry={thread} position={[0, top - threadLen / 2, 0]} castShadow>
        <meshStandardMaterial {...SCREW_ZINC} side={THREE.DoubleSide} />
      </mesh>
      {/* hex nut threaded partway down + flat washer under it */}
      <mesh position={[0, top - 0.26, 0]} castShadow>
        <cylinderGeometry args={[0.118, 0.118, 0.11, 6]} /><meshStandardMaterial {...SCREW_ZINC} flatShading />
      </mesh>
      <mesh position={[0, top - 0.33, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 0.022, 28]} /><meshStandardMaterial {...SCREW_ZINC} />
      </mesh>
      {/* expansion clip: a slightly proud slitted sleeve above the mandrel */}
      <mesh position={[0, bot + 0.19, 0]} castShadow>
        <cylinderGeometry args={[r + 0.009, r + 0.009, 0.17, 24, 1, true]} />
        <meshStandardMaterial {...SCREW_ZINC} side={THREE.DoubleSide} />
      </mesh>
      {[0.6, 2.7].map((a) => (
        <mesh key={a} position={[Math.cos(a) * (r + 0.012), bot + 0.19, -Math.sin(a) * (r + 0.012)]} rotation={[0, a, 0]}>
          <boxGeometry args={[0.006, 0.17, 0.012]} />
          <meshStandardMaterial color="#5b6167" metalness={0.6} roughness={0.6} />
        </mesh>
      ))}
      {/* wedge mandrel: flares out at the bottom, then a chamfered flat butt */}
      <mesh position={[0, bot + 0.055, 0]} castShadow>
        <cylinderGeometry args={[r, r + 0.016, 0.11, 24]} /><meshStandardMaterial {...SCREW_ZINC} />
      </mesh>
      <mesh position={[0, bot - 0.012, 0]} castShadow>
        <cylinderGeometry args={[r + 0.016, r + 0.004, 0.024, 24]} /><meshStandardMaterial {...SCREW_ZINC} />
      </mesh>
    </group>
  )
}

// ── Titen HD (Strong-Tie heavy-duty screw anchor for concrete) ──────────────────
// Big zinc hex-washer head on a THICK shank with tall, wide-pitch cutting threads
// running down to a tapered gimlet tip.
function TitenHD({ params }: ModelProps) {
  const inches = params?.len ?? 5
  const shaftLen = 0.55 + inches * 0.07   // representative: 5" → 0.9
  const r = 0.078
  const topY = 0.86                        // meets the HexWasherHead flange
  const botY = topY - shaftLen
  const threadLen = shaftLen - 0.1
  const thread = useMemo(
    () => screwThreadGeometry(r, 0.135, threadLen, Math.round(threadLen / 0.11), 0.034),
    [threadLen],
  )
  return (
    <group rotation={[0, 0, Math.PI * 0.12]}>
      <HexWasherHead mat={SCREW_ZINC} />
      {/* thick shank */}
      <mesh position={[0, (topY + botY) / 2, 0]} castShadow>
        <cylinderGeometry args={[r, r, shaftLen, 28]} /><meshStandardMaterial {...SCREW_ZINC} />
      </mesh>
      {/* heavy cutting thread down the shank */}
      <mesh geometry={thread} position={[0, topY - 0.06 - threadLen / 2, 0]} castShadow>
        <meshStandardMaterial {...SCREW_ZINC} side={THREE.DoubleSide} />
      </mesh>
      {/* gimlet taper to a blunt point */}
      <mesh position={[0, botY - 0.055, 0]} castShadow>
        <cylinderGeometry args={[r, 0.02, 0.12, 24]} /><meshStandardMaterial {...SCREW_ZINC} />
      </mesh>
    </group>
  )
}

// ── Asphalt anchor (30" barbed rod, loose L-bracket head) ───────────────────────
// Mobile-home-style asphalt anchor, always black/bare steel — finish colors don't
// apply. A ¾" rod with three diamond-barb plates staggered up the lower shaft
// (swept toward the head: it drives down, the barbs bite on pull-out) and a long
// taper to the driving point. At the top a LOOSE L-bracket rides on the rod — the
// rod runs through a clearance hole in the bracket's top leg and a cross-pin at
// the tip keeps it captured; the open hole beside it is what gets bolted down.
const ANCHOR_BLACK = { color: '#212327', metalness: 0.5, roughness: 0.55 }

function AsphaltAnchor() {
  const L = 2.5, r = 0.034            // 30" × ¾" rod
  const top = L / 2
  const plateT = 0.016                // ~3/16" plate stock
  const legX = -0.07                  // bracket bend line (down-leg side)
  const plateY = top - 0.082          // top-leg mid-plane
  // Bracket top leg: flat plate with a loose rod hole at the bend end and the
  // open bolt hole out on the free end.
  const bracketGeo = useMemo(() => {
    const s = new THREE.Shape()
    const x1 = 0.165, hw = 0.07
    s.moveTo(legX, -hw); s.lineTo(x1, -hw); s.lineTo(x1, hw); s.lineTo(legX, hw); s.closePath()
    const rodHole = new THREE.Path(); rodHole.absarc(0, 0, r + 0.008, 0, Math.PI * 2, true)
    const boltHole = new THREE.Path(); boltHole.absarc(0.115, 0, 0.027, 0, Math.PI * 2, true)
    s.holes.push(rodHole, boltHole)
    return extrudeProfile(s, plateT)
  }, [])
  // Diamond barb: parallelogram plate leaning toward the head, angle-cut outer edge.
  const finGeo = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(0, 0)
    s.lineTo(1.7 / 12, 1.1 / 12)      // swept lower edge
    s.lineTo(1.7 / 12, 2.05 / 12)     // outer edge
    s.lineTo(0, 1.45 / 12)            // swept upper edge back to the rod
    s.closePath()
    return extrudeProfile(s, plateT)
  }, [])
  return (
    <group>
      {/* shaft, long taper to the driving point */}
      <mesh position={[0, 0.07, 0]} castShadow>
        <cylinderGeometry args={[r, r, L - 0.14, 24]} /><meshStandardMaterial {...ANCHOR_BLACK} />
      </mesh>
      <mesh position={[0, -top + 0.07, 0]} castShadow>
        <cylinderGeometry args={[r, 0.008, 0.14, 24]} /><meshStandardMaterial {...ANCHOR_BLACK} />
      </mesh>
      {/* capture cross-pin through the tip, above the bracket */}
      <mesh position={[0, top - 0.025, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.009, 0.009, 0.075, 12]} /><meshStandardMaterial {...ANCHOR_BLACK} />
      </mesh>
      {/* loose L-bracket, swiveled off-plane like it hangs in real life */}
      <group rotation={[0, -0.35, 0]}>
        <mesh geometry={bracketGeo} position={[0, plateY, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
          <meshStandardMaterial {...ANCHOR_BLACK} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[legX - plateT / 2, plateY - plateT / 2 - 0.1, 0]} castShadow>
          <boxGeometry args={[plateT, 0.2, 0.14]} /><meshStandardMaterial {...ANCHOR_BLACK} />
        </mesh>
      </group>
      {/* staggered diamond-barb fins, alternating sides */}
      {([[0.35, 0], [-0.25, Math.PI], [-0.62, 0]] as const).map(([y, rot]) => (
        <mesh key={y} geometry={finGeo} position={[0, y, 0]} rotation={[0, rot, 0]} castShadow>
          <meshStandardMaterial {...ANCHOR_BLACK} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

// ── Generic anchor (mobile-home: threaded rod + nut, pointed tip) ────────────────
function Anchor({ colorName }: ModelProps) {
  const steel = useSteel(colorName, '#9aa0a6')
  const rodR = 0.055, rodL = 2.2
  return (
    <group rotation={[0, 0, Math.PI / 2]}>
      <mesh castShadow><cylinderGeometry args={[rodR, rodR, rodL, 18]} /><meshStandardMaterial {...steel} /></mesh>
      {Array.from({ length: 30 }).map((_, i) => (
        <mesh key={i} position={[0, rodL / 2 - 0.05 - i * 0.06, 0]}>
          <torusGeometry args={[rodR + 0.01, 0.011, 5, 14]} /><meshStandardMaterial {...steel} />
        </mesh>
      ))}
      {/* hex nut + bearing washer near the head */}
      <mesh position={[0, rodL / 2 - 0.14, 0]} castShadow><cylinderGeometry args={[0.13, 0.13, 0.11, 6]} /><meshStandardMaterial {...steel} /></mesh>
      <mesh position={[0, rodL / 2 - 0.02, 0]} castShadow><cylinderGeometry args={[0.17, 0.17, 0.03, 24]} /><meshStandardMaterial {...steel} /></mesh>
      {/* pointed tip */}
      <mesh position={[0, -rodL / 2 - 0.13, 0]} castShadow><coneGeometry args={[rodR, 0.28, 18]} /><meshStandardMaterial {...steel} /></mesh>
    </group>
  )
}

// ── Mobile-home auger anchor (MHA) ───────────────────────────────────────────────
// Earth auger: long galvanized rod with a single-turn helix PLATE near the pointed
// tip (screws into the ground) and a slotted strap head at the top.
function AugerAnchor() {
  const rodR = 0.038, rodL = 2.2
  // Black painted steel earth auger: a long rod with a forged eye at the top and TWO
  // wide auger flights (mid-shaft + near the bottom) — a double-helix mobile-home anchor.
  const black = { color: '#26282a', metalness: 0.5, roughness: 0.52 }
  // One ~full turn of the auger flight (a wide, thin helical plate).
  const flight = useMemo(() => screwThreadGeometry(rodR, 0.22, 0.11, 1, 0.014, 96), [])
  return (
    <group rotation={[0, 0.6, 0.06]}>
      {/* rod */}
      <mesh castShadow><cylinderGeometry args={[rodR, rodR, rodL, 20]} /><meshStandardMaterial {...black} /></mesh>
      {/* forged round eyelet at the top */}
      <mesh position={[0, rodL / 2 + 0.1, 0]} castShadow>
        <torusGeometry args={[0.12, 0.032, 20, 36]} /><meshStandardMaterial {...black} />
      </mesh>
      {/* mid-shaft auger flight */}
      <mesh geometry={flight} position={[0, -0.2, 0]} castShadow>
        <meshStandardMaterial {...black} side={THREE.DoubleSide} />
      </mesh>
      {/* lower auger flight near the bottom */}
      <mesh geometry={flight} position={[0, -rodL / 2 + 0.2, 0]} castShadow>
        <meshStandardMaterial {...black} side={THREE.DoubleSide} />
      </mesh>
      {/* blunt pointed bottom */}
      <mesh position={[0, -rodL / 2 - 0.03, 0]} rotation={[Math.PI, 0, 0]} castShadow>
        <coneGeometry args={[rodR, 0.12, 20]} /><meshStandardMaterial {...black} />
      </mesh>
    </group>
  )
}

// ── Hex bolt (MHA bolts) ─────────────────────────────────────────────────────────
// Plain zinc hex bolt kitted the way mobile-home anchor bolts ship: hex head,
// smooth shank, threaded lower half, and TWO flat washers plus a hex nut run onto
// the threads. Chamfered flat end (no drill point — it's a bolt, not a screw).
function HexBolt() {
  const r = 0.07, shankL = 0.55, threadL = 0.38
  const thread = useMemo(() => screwThreadGeometry(r, 0.096, threadL, 8, 0.019), [])
  const top = 0.5
  const shankBottom = top - shankL           // y where the threaded section begins
  return (
    <group rotation={[0, 0, Math.PI * 0.3]}>
      {/* hex head */}
      <mesh position={[0, top + 0.075, 0]} castShadow>
        <cylinderGeometry args={[0.155, 0.155, 0.13, 6]} /><meshStandardMaterial {...SCREW_ZINC} flatShading />
      </mesh>
      {/* washer #1 — seated under the head */}
      <mesh position={[0, top - 0.03, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.1, 0.026, 16, 32]} /><meshStandardMaterial {...SCREW_ZINC} />
      </mesh>
      {/* smooth shank, then threads */}
      <mesh position={[0, top - shankL / 2, 0]} castShadow>
        <cylinderGeometry args={[r, r, shankL, 24]} /><meshStandardMaterial {...SCREW_ZINC} />
      </mesh>
      <mesh geometry={thread} position={[0, shankBottom - threadL / 2 + 0.02, 0]} castShadow>
        <meshStandardMaterial {...SCREW_ZINC} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, shankBottom - threadL / 2 + 0.02, 0]} castShadow>
        <cylinderGeometry args={[r, r, threadL, 24]} /><meshStandardMaterial {...SCREW_ZINC} />
      </mesh>
      {/* washer #2 — sits on the threads above the nut */}
      <mesh position={[0, shankBottom - 0.03, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.1, 0.026, 16, 32]} /><meshStandardMaterial {...SCREW_ZINC} />
      </mesh>
      {/* hex nut run onto the threads */}
      <mesh position={[0, shankBottom - 0.14, 0]} castShadow>
        <cylinderGeometry args={[0.135, 0.135, 0.12, 6]} /><meshStandardMaterial {...SCREW_ZINC} flatShading />
      </mesh>
      {/* chamfered flat end */}
      <mesh position={[0, shankBottom - threadL + 0.006, 0]} castShadow>
        <cylinderGeometry args={[r, r * 0.72, 0.028, 24]} /><meshStandardMaterial {...SCREW_ZINC} />
      </mesh>
    </group>
  )
}

// ── Walk-in door knob ─────────────────────────────────────────────────────────────
// Polished stainless ball knob on a neck over a round rosette (mounted to a small
// door-slab swatch so the scale reads).
function DoorKnob() {
  const chrome = { color: '#dfe3e7', metalness: 0.8, roughness: 0.22, envMapIntensity: 1.6 }
  const slab = { color: '#e8e8e6', metalness: 0.2, roughness: 0.6 }
  return (
    <group rotation={[0, 0.5, 0]}>
      {/* door-slab swatch behind */}
      <mesh position={[0, 0, -0.06]} receiveShadow>
        <boxGeometry args={[1.1, 1.1, 0.08]} /><meshStandardMaterial {...slab} />
      </mesh>
      {/* rosette */}
      <mesh position={[0, 0, 0.02]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.19, 0.21, 0.05, 32]} />
        <meshStandardMaterial {...chrome} />
      </mesh>
      {/* neck */}
      <mesh position={[0, 0, 0.12]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.09, 0.16, 24]} /><meshStandardMaterial {...chrome} />
      </mesh>
      {/* ball knob (slightly squashed sphere) */}
      <mesh position={[0, 0, 0.3]} scale={[1, 1, 0.82]} castShadow>
        <sphereGeometry args={[0.17, 32, 24]} /><meshStandardMaterial {...chrome} />
      </mesh>
    </group>
  )
}

// ── Walk-in door hardware (butt hinge) ───────────────────────────────────────────
// A zinc butt hinge opened ~120°: two leaves with countersunk screw holes joined
// by a knuckle barrel with a finial pin.
function Hinge() {
  const leafW = 0.42, leafH = 0.95, t = 0.022
  const hole = { color: '#3a3e42', metalness: 0.4, roughness: 0.7 }
  const holes = [-0.32, 0, 0.32]
  const leaf = (sign: number) => (
    <group rotation={[0, sign * (Math.PI / 3), 0]}>
      <mesh position={[sign * (leafW / 2 + 0.02), 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[leafW, leafH, t]} /><meshStandardMaterial {...SCREW_ZINC} />
      </mesh>
      {holes.map((y) => (
        <mesh key={y} position={[sign * (leafW / 2 + 0.02), y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.035, t + 0.006, 16]} /><meshStandardMaterial {...hole} />
        </mesh>
      ))}
    </group>
  )
  return (
    <group rotation={[0.15, 0.35, 0]}>
      {leaf(1)}
      {leaf(-1)}
      {/* knuckle barrel + pin finials */}
      <mesh castShadow><cylinderGeometry args={[0.045, 0.045, leafH, 20]} /><meshStandardMaterial {...SCREW_ZINC} /></mesh>
      {[1, -1].map((s) => (
        <mesh key={s} position={[0, s * (leafH / 2 + 0.025), 0]} castShadow>
          <sphereGeometry args={[0.05, 16, 12]} /><meshStandardMaterial {...SCREW_ZINC} />
        </mesh>
      ))}
    </group>
  )
}

// ── Walk-in door hardware (knob set + key) ───────────────────────────────────────
// A full passage lockset: a polished ball knob on BOTH faces of a thin door slab
// (interior + exterior) with a latch on the door edge, plus a brass key in front —
// so the product reads as door hardware at a glance.
function DoorHardware() {
  const chrome = { color: '#c3c8cd', metalness: 0.9, roughness: 0.3, envMapIntensity: 1.5 }   // silver
  const brass = { color: '#c8a13a', metalness: 0.85, roughness: 0.3, envMapIntensity: 1.4 }
  const slab = { color: '#e8e8e6', metalness: 0.2, roughness: 0.6 }

  // One knob assembly (rosette + neck + squashed ball) on a face: sign = ±1 → ±Z.
  const knob = (sign: number) => (
    <group>
      <mesh position={[0, 0, sign * 0.05]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.19, 0.21, 0.05, 32]} /><meshStandardMaterial {...chrome} />
      </mesh>
      <mesh position={[0, 0, sign * 0.14]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.09, 0.16, 24]} /><meshStandardMaterial {...chrome} />
      </mesh>
      <mesh position={[0, 0, sign * 0.3]} scale={[1, 1, 0.82]} castShadow>
        <sphereGeometry args={[0.17, 32, 24]} /><meshStandardMaterial {...chrome} />
      </mesh>
    </group>
  )

  return (
    <group rotation={[0.2, 0.6, 0]}>
      {/* thin door slab — the knobs pass through and show on both faces */}
      <mesh receiveShadow castShadow>
        <boxGeometry args={[0.9, 0.98, 0.06]} /><meshStandardMaterial {...slab} />
      </mesh>
      {/* latch faceplate + bolt on the door edge */}
      <mesh position={[0.45, 0, 0]} castShadow>
        <boxGeometry args={[0.03, 0.34, 0.1]} /><meshStandardMaterial {...chrome} />
      </mesh>
      <mesh position={[0.51, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.028, 0.028, 0.05, 16]} /><meshStandardMaterial {...chrome} />
      </mesh>
      {knob(1)}
      {knob(-1)}

      {/* brass key, angled in front below the knob */}
      <group position={[0.02, -0.66, 0.32]} rotation={[0.55, 0, 0.55]}>
        {/* bow (ring) */}
        <mesh position={[-0.4, 0, 0]} castShadow>
          <torusGeometry args={[0.12, 0.035, 16, 28]} /><meshStandardMaterial {...brass} />
        </mesh>
        {/* collar between bow and shaft */}
        <mesh position={[-0.26, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.06, 16]} /><meshStandardMaterial {...brass} />
        </mesh>
        {/* shaft */}
        <mesh castShadow>
          <boxGeometry args={[0.6, 0.05, 0.02]} /><meshStandardMaterial {...brass} />
        </mesh>
        {/* teeth (bittings) toward the tip */}
        {[0.14, 0.21, 0.28].map((x, i) => (
          <mesh key={x} position={[x, -0.05 - i * 0.004, 0]} castShadow>
            <boxGeometry args={[0.035, 0.06, 0.02]} /><meshStandardMaterial {...brass} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

// ── Heavy-duty door hardware (lever set + key) ───────────────────────────────────
// A lever-handle passage set: a silver lever on BOTH faces of a thin door slab with
// a latch on the edge, plus a key in front — the hardware that ships with the
// heavy-duty door.
function DoorHardwareLever() {
  const silver = { color: '#c3c8cd', metalness: 0.9, roughness: 0.3, envMapIntensity: 1.5 }
  const brass = { color: '#c8a13a', metalness: 0.85, roughness: 0.3, envMapIntensity: 1.4 }
  const slab = { color: '#e8e8e6', metalness: 0.2, roughness: 0.6 }

  // One lever assembly (rosette + neck + horizontal handle) on a face: sign = ±1 → ±Z.
  const lever = (sign: number) => (
    <group>
      <mesh position={[0, 0, sign * 0.05]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.17, 0.05, 32]} /><meshStandardMaterial {...silver} />
      </mesh>
      <mesh position={[0, 0, sign * 0.14]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.07, 0.16, 20]} /><meshStandardMaterial {...silver} />
      </mesh>
      {/* horizontal handle + rounded tip */}
      <mesh position={[-0.18, 0, sign * 0.24]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.045, 0.05, 0.42, 20]} /><meshStandardMaterial {...silver} />
      </mesh>
      <mesh position={[-0.39, 0, sign * 0.24]} castShadow>
        <sphereGeometry args={[0.05, 16, 12]} /><meshStandardMaterial {...silver} />
      </mesh>
    </group>
  )

  return (
    <group rotation={[0.2, 0.6, 0]}>
      {/* thin door slab — the levers pass through and show on both faces */}
      <mesh receiveShadow castShadow>
        <boxGeometry args={[0.9, 0.98, 0.06]} /><meshStandardMaterial {...slab} />
      </mesh>
      {/* latch faceplate + bolt on the door edge */}
      <mesh position={[0.45, 0, 0]} castShadow>
        <boxGeometry args={[0.03, 0.34, 0.1]} /><meshStandardMaterial {...silver} />
      </mesh>
      <mesh position={[0.51, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.028, 0.028, 0.05, 16]} /><meshStandardMaterial {...silver} />
      </mesh>
      {lever(1)}
      {lever(-1)}

      {/* key, angled in front below the lever */}
      <group position={[0.02, -0.66, 0.32]} rotation={[0.55, 0, 0.55]}>
        <mesh position={[-0.4, 0, 0]} castShadow>
          <torusGeometry args={[0.12, 0.035, 16, 28]} /><meshStandardMaterial {...brass} />
        </mesh>
        <mesh position={[-0.26, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.05, 0.05, 0.06, 16]} /><meshStandardMaterial {...brass} />
        </mesh>
        <mesh castShadow>
          <boxGeometry args={[0.6, 0.05, 0.02]} /><meshStandardMaterial {...brass} />
        </mesh>
        {[0.14, 0.21, 0.28].map((x, i) => (
          <mesh key={x} position={[x, -0.05 - i * 0.004, 0]} castShadow>
            <boxGeometry args={[0.035, 0.06, 0.02]} /><meshStandardMaterial {...brass} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

// ── Roof truss (open-web triangle) ──────────────────────────────────────────────
function Truss({ colorName }: ModelProps) {
  const steel = useTubeSteel(colorName)
  const span = 4, rise = 1.1, r = 0.045
  // Endpoints of a simple king-post + diagonal truss.
  const bl: [number, number, number] = [-span / 2, 0, 0]
  const br: [number, number, number] = [span / 2, 0, 0]
  const peak: [number, number, number] = [0, rise, 0]
  const members: [[number, number, number], [number, number, number]][] = [
    [bl, br],           // bottom chord
    [bl, peak],         // left top chord
    [br, peak],         // right top chord
    [[0, 0, 0], peak],  // king post
    [[-span / 4, 0, 0], peak],
    [[span / 4, 0, 0], peak],
  ]
  return (
    <group>
      {members.map(([a, b], i) => {
        const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b)
        const mid = va.clone().add(vb).multiplyScalar(0.5)
        const len = va.distanceTo(vb)
        const quat = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize(),
        )
        return (
          <mesh key={i} position={mid.toArray()} quaternion={[quat.x, quat.y, quat.z, quat.w]} castShadow>
            <cylinderGeometry args={[r, r, len, 12]} /><meshStandardMaterial {...steel} />
          </mesh>
        )
      })}
    </group>
  )
}

// ── Window (framed, glazed) ─────────────────────────────────────────────────────
function Window({ params }: ModelProps) {
  const wIn = params?.w ?? 24, hIn = params?.h ?? 36
  const w = wIn / 12, h = hIn / 12, fr = 0.12, d = 0.14
  // Window frames are white vinyl regardless of the building color.
  const frame = { color: '#f5f5f2', metalness: 0.05, roughness: 0.45 }
  const frames: [number, number, number, number, number][] = [
    [0, h / 2 - fr / 2, w, fr, 0], [0, -h / 2 + fr / 2, w, fr, 0],
    [-w / 2 + fr / 2, 0, fr, h, 0], [w / 2 - fr / 2, 0, fr, h, 0],
    [0, 0, fr * 0.7, h, 1],
  ]
  return (
    <group>
      {frames.map((f, i) => (
        <mesh key={i} position={[f[0], f[1], 0]} castShadow>
          <boxGeometry args={[f[2], f[3], d]} /><meshStandardMaterial {...frame} />
        </mesh>
      ))}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[w - fr, h - fr, 0.04]} />
        <meshStandardMaterial color="#9fd3e0" metalness={0.1} roughness={0.05} transparent opacity={0.4} />
      </mesh>
    </group>
  )
}

// ── Gridded window (colonial grilles) ───────────────────────────────────────────
// The framed window with a 3×3 muntin grid over the glass — a grille pattern shown
// on both faces.
function WindowGrid({ params }: ModelProps) {
  const wIn = params?.w ?? 36, hIn = params?.h ?? 36
  const w = wIn / 12, h = hIn / 12, fr = 0.12, d = 0.14
  const frame = { color: '#f5f5f2', metalness: 0.05, roughness: 0.45 }
  const glassW = w - fr, glassH = h - fr
  const bar = 0.035
  return (
    <group>
      {/* outer frame */}
      {([[0, h / 2 - fr / 2, w, fr], [0, -h / 2 + fr / 2, w, fr], [-w / 2 + fr / 2, 0, fr, h], [w / 2 - fr / 2, 0, fr, h]] as [number, number, number, number][]).map((f, i) => (
        <mesh key={i} position={[f[0], f[1], 0]} castShadow>
          <boxGeometry args={[f[2], f[3], d]} /><meshStandardMaterial {...frame} />
        </mesh>
      ))}
      {/* glass */}
      <mesh>
        <boxGeometry args={[glassW, glassH, 0.04]} />
        <meshStandardMaterial color="#9fd3e0" metalness={0.1} roughness={0.05} transparent opacity={0.4} />
      </mesh>
      {/* 3×3 grille: 2 vertical + 2 horizontal muntins spanning the glass depth */}
      {[-glassW / 6, glassW / 6].map((x, i) => (
        <mesh key={'v' + i} position={[x, 0, 0]}><boxGeometry args={[bar, glassH, d * 0.8]} /><meshStandardMaterial {...frame} /></mesh>
      ))}
      {[-glassH / 6, glassH / 6].map((y, i) => (
        <mesh key={'h' + i} position={[0, y, 0]}><boxGeometry args={[glassW, bar, d * 0.8]} /><meshStandardMaterial {...frame} /></mesh>
      ))}
    </group>
  )
}

// ── Roll-up door (Janus-pattern rolling sheet door) ─────────────────────────────
// Dimensions follow the Janus 650/2500 spec sheets (see ROLLUP-DOOR-REFERENCE.md):
// 26 ga corrugated curtain coiling onto a spring barrel above the opening, 2" roll-
// formed guides spaced curtain + 1", galvanized-angle bottom bar with PVC astragal,
// right-hand mini latch. United Metal doors have no bracket plates — the dead-axle
// torque tube just protrudes from each end of the coil (~3-1/4" per spec sideroom).
function GarageDoor({ colorName, params }: ModelProps) {
  const w = params?.w ?? 8, h = params?.h ?? 8
  // No color selected → painted High Gloss White (the Janus default), not bare steel.
  const picked = useSteel(colorName, '#f4f4f0')
  const steel = colorName ? picked : { color: '#f4f4f0', metalness: 0.35, roughness: 0.45 }
  const galv = { color: '#b4b9bd', metalness: 0.85, roughness: 0.32 }
  const zinc = { color: '#c9b46a', metalness: 0.8, roughness: 0.35 }   // yellow-zinc latch
  const pvc = { color: '#3a3a3a', metalness: 0, roughness: 0.95 }

  const curtainW = w + 0.08          // curtain runs into the guides (width + 1")
  const coilR = 0.5 + h * 0.02       // ≈16" dia roll for an 8' door (spec headroom)
  const coilY = h / 2 + coilR + 0.03 // barrel centered above the opening
  const coilZ = -coilR + 0.012      // front tangent meets the curtain plane (z≈0)

  // Corrugated curtain: shallow rounded wave ~3.3" pitch, ~0.7" deep (scaled from
  // Janus drawings) — softer than the trapezoidal R-panel rib.
  const curtainGeo = useMemo(() => {
    const pitch = 0.275, depth = 0.058, sheet = 0.012
    const top = coilY, bot = -h / 2
    const len = top - bot
    const steps = Math.max(24, Math.round((len / pitch) * 10))
    const pts: [number, number][] = []
    for (let i = 0; i <= steps; i++) {
      const y = bot + (i / steps) * len
      pts.push([y, depth * 0.5 * (1 - Math.cos((2 * Math.PI * y) / pitch))])
    }
    return extrudeProfile(ribbonShape(pts, sheet), curtainW)
  }, [h, coilY, curtainW])

  // Guides: 2" face × 2" leg channel each side of the opening.
  const gF = 2 / 12, gD = 2 / 12, gT = 0.018
  const guideX = w / 2 + gF / 2
  const Guide = ({ side }: { side: 1 | -1 }) => (
    <group position={[side * guideX, 0, 0]}>
      <mesh position={[0, 0, gD / 2]} castShadow><boxGeometry args={[gF, h, gT]} /><meshStandardMaterial {...galv} /></mesh>
      <mesh position={[0, 0, -gD / 2]} castShadow><boxGeometry args={[gF, h, gT]} /><meshStandardMaterial {...galv} /></mesh>
      <mesh position={[side * (gF / 2), 0, 0]} castShadow><boxGeometry args={[gT, h, gD]} /><meshStandardMaterial {...galv} /></mesh>
      {/* head stop clip near the top of the guide */}
      <mesh position={[0, h / 2 - 0.5, gD / 2 + 0.015]}><boxGeometry args={[gF * 0.8, 0.09, 0.03]} /><meshStandardMaterial {...galv} /></mesh>
    </group>
  )

  return (
    <group position={[0, -(coilY + coilR - h / 2) / 2, 0]}>
      {/* coiled curtain on the barrel, wrap edge hinted at each end */}
      <group position={[0, coilY, coilZ]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[coilR, coilR, curtainW, 48]} /><meshStandardMaterial {...steel} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * (curtainW / 2 - 0.005), 0, 0]} rotation={[0, s * Math.PI / 2, 0]}>
            <torusGeometry args={[coilR - 0.02, 0.012, 8, 48]} /><meshStandardMaterial {...steel} />
          </mesh>
        ))}
        {/* dead-axle torque tube protruding from each end of the coil */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * (curtainW / 2 + 0.11), 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.055, 0.055, 0.32, 16]} /><meshStandardMaterial {...galv} />
          </mesh>
        ))}
      </group>

      {/* corrugated curtain (profile x→Y, depth→Z, run→X) */}
      <mesh geometry={curtainGeo} rotation={[0, Math.PI / 2, Math.PI / 2]} castShadow receiveShadow>
        <meshStandardMaterial {...steel} side={THREE.DoubleSide} />
      </mesh>

      <Guide side={-1} />
      <Guide side={1} />

      {/* bottom bar: galvanized angle + PVC bulb astragal + handle + stop clips */}
      <group position={[0, -h / 2 + 0.07, 0]}>
        <mesh castShadow><boxGeometry args={[curtainW, 0.13, 0.04]} /><meshStandardMaterial {...galv} /></mesh>
        <mesh position={[0, -0.02, -0.07]}><boxGeometry args={[curtainW, 0.02, 0.13]} /><meshStandardMaterial {...galv} /></mesh>
        <mesh position={[0, -0.075, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.032, 0.032, curtainW, 16]} /><meshStandardMaterial {...pvc} />
        </mesh>
        {/* lift handle (stirrup) centered on the outside face */}
        <group position={[0, 0.01, 0.09]}>
          {[-0.14, 0.14].map((x) => (
            <mesh key={x} position={[x, 0, 0.015]}><boxGeometry args={[0.03, 0.03, 0.05]} /><meshStandardMaterial {...galv} /></mesh>
          ))}
          <mesh position={[0, 0, 0.045]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.018, 0.018, 0.32, 12]} /><meshStandardMaterial {...galv} />
          </mesh>
        </group>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * (curtainW / 2 - 0.08), 0.09, 0.03]}><boxGeometry args={[0.1, 0.05, 0.03]} /><meshStandardMaterial {...galv} /></mesh>
        ))}
      </group>

      {/* curtain-mounted mini latch, right side above the bottom bar */}
      <mesh position={[w / 2 - 0.28, -h / 2 + 0.45, 0.075]} castShadow>
        <boxGeometry args={[0.38, 0.2, 0.035]} /><meshStandardMaterial {...zinc} />
      </mesh>
    </group>
  )
}

// ── Walk-in doors (slab + frame family) ─────────────────────────────────────────
// A family of standard 36" x 80" walk-in doors that share a slab + jamb frame and
// differ by frame finish, whether there's a threshold at the sill, and the glazing
// pattern — so the storefront reads each door apart at a glance.
const DOOR_W = 3, DOOR_H = 6.7, DOOR_D = 0.12
const DOOR_BORE_X = DOOR_W / 2 - 0.26, DOOR_BORE_Y = -0.3   // lockset bore hole
const doorWhite: THREE.MeshStandardMaterialParameters = { color: '#f1f1ee', metalness: 0.04, roughness: 0.62 }
const doorPanel: THREE.MeshStandardMaterialParameters = { color: '#e6e6e1', metalness: 0.04, roughness: 0.66 }
const doorMetal: THREE.MeshStandardMaterialParameters = { color: '#c3c9ce', metalness: 0.85, roughness: 0.34, envMapIntensity: 1.8 }
const doorGrey: THREE.MeshStandardMaterialParameters = { color: '#8b9096', metalness: 0, roughness: 0.95 }
const doorAlu: THREE.MeshStandardMaterialParameters = { color: '#ced3d8', metalness: 0.9, roughness: 0.26, envMapIntensity: 1.7 }
const doorGlass: THREE.MeshStandardMaterialParameters = { color: '#bcd8e2', metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.42 }

// A door slab (or stile) as an extruded rectangle with a real circular through-hole
// where the lockset bore goes — the door ships without a knob, so the bore reads as
// an open hole rather than a solid face.
function useHoledSlab(w: number, h: number, holeX: number, holeY: number, holeR = 0.088, d = DOOR_D) {
  return useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(-w / 2, -h / 2)
    shape.lineTo(w / 2, -h / 2)
    shape.lineTo(w / 2, h / 2)
    shape.lineTo(-w / 2, h / 2)
    shape.closePath()
    const hole = new THREE.Path()
    hole.absarc(holeX, holeY, holeR, 0, Math.PI * 2, true)
    shape.holes.push(hole)
    const geo = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false, curveSegments: 24 })
    geo.translate(0, 0, -d / 2)
    geo.computeVertexNormals()
    return geo
  }, [w, h, holeX, holeY, holeR, d])
}

// Jamb frame around the slab: left/right/head, with an optional sill threshold.
function DoorFrame({ mat, threshold, thresholdMat, fw = 0.16, fd = 0.2 }: {
  mat: THREE.MeshStandardMaterialParameters
  threshold?: boolean
  thresholdMat?: THREE.MeshStandardMaterialParameters
  fw?: number
  fd?: number
}) {
  const w = DOOR_W, h = DOOR_H
  return (
    <group>
      <mesh position={[-(w / 2 + fw / 2), 0, 0]} castShadow receiveShadow><boxGeometry args={[fw, h + fw * 2, fd]} /><meshStandardMaterial {...mat} /></mesh>
      <mesh position={[w / 2 + fw / 2, 0, 0]} castShadow receiveShadow><boxGeometry args={[fw, h + fw * 2, fd]} /><meshStandardMaterial {...mat} /></mesh>
      <mesh position={[0, h / 2 + fw / 2, 0]} castShadow receiveShadow><boxGeometry args={[w + fw * 2, fw, fd]} /><meshStandardMaterial {...mat} /></mesh>
      {threshold && (
        <mesh position={[0, -(h / 2 + 0.045), 0]} castShadow receiveShadow><boxGeometry args={[w + fw * 2, 0.09, fd * 1.05]} /><meshStandardMaterial {...(thresholdMat ?? doorMetal)} /></mesh>
      )}
    </group>
  )
}

// The standard door: white slab, white frame, two recessed panels, sill threshold.
function WalkinDoor() {
  const w = DOOR_W, h = DOOR_H, d = DOOR_D
  const slab = useHoledSlab(w, h, DOOR_BORE_X, DOOR_BORE_Y)
  return (
    <group>
      <DoorFrame mat={doorWhite} threshold thresholdMat={doorMetal} fw={0.18} fd={0.22} />
      <mesh geometry={slab} castShadow receiveShadow><meshStandardMaterial {...doorWhite} /></mesh>
      {[h * 0.22, -h * 0.22].map((y, i) => (
        <mesh key={i} position={[0, y, d / 2 + 0.004]} castShadow><boxGeometry args={[w * 0.64, h * 0.32, 0.02]} /><meshStandardMaterial {...doorPanel} /></mesh>
      ))}
    </group>
  )
}

// Heavy-duty door: medium-grey metal slab + frame + threshold, kickplate, hinges.
function WalkinDoorHD() {
  const w = DOOR_W, h = DOOR_H, d = DOOR_D
  const slab = useHoledSlab(w, h, DOOR_BORE_X, DOOR_BORE_Y)
  return (
    <group>
      <DoorFrame mat={doorGrey} threshold thresholdMat={doorGrey} fw={0.17} fd={0.22} />
      <mesh geometry={slab} castShadow receiveShadow><meshStandardMaterial {...doorGrey} /></mesh>
      {/* kickplate */}
      <mesh position={[0, -h / 2 + 0.4, d / 2 + 0.006]} castShadow><boxGeometry args={[w * 0.94, 0.7, 0.012]} /><meshStandardMaterial color="#9aa0a6" metalness={0} roughness={0.9} /></mesh>
      {/* hinges on the hinge stile */}
      {[h * 0.34, 0, -h * 0.34].map((y, i) => (
        <mesh key={i} position={[-w / 2 + 0.02, y, 0]} castShadow><boxGeometry args={[0.07, 0.36, d + 0.02]} /><meshStandardMaterial {...doorGrey} /></mesh>
      ))}
    </group>
  )
}

// Smooth full-view door: flush slab in a slim metal frame, no threshold — just the
// frame. The base for the diamond-lite variant.
function DoorFullView() {
  const w = DOOR_W, h = DOOR_H
  const slab = useHoledSlab(w, h, DOOR_BORE_X, DOOR_BORE_Y)
  return (
    <group>
      <DoorFrame mat={doorAlu} fw={0.1} fd={0.2} />
      <mesh geometry={slab} castShadow receiveShadow><meshStandardMaterial {...doorWhite} /></mesh>
    </group>
  )
}

// Cottage door: white slab, solid bottom panel, a 3×3 grid of glass lites divided
// by white muntins (9 windows), sill threshold. Bore hole through the lock stile.
function DoorCottage() {
  const w = DOOR_W, h = DOOR_H, d = DOOR_D
  const stile = 0.34
  const botH = h * 0.3
  const glassTopY = h / 2 - stile
  const glassBotY = -h / 2 + botH
  const gh = glassTopY - glassBotY
  const gcy = (glassTopY + glassBotY) / 2
  const gw = w - stile * 2
  const lockStile = useHoledSlab(stile, h, 0, DOOR_BORE_Y)
  return (
    <group>
      <DoorFrame mat={doorWhite} threshold thresholdMat={doorMetal} fw={0.18} fd={0.22} />
      {/* perimeter stiles (right one has the bore hole) + top rail */}
      <mesh position={[-(w / 2 - stile / 2), 0, 0]} castShadow receiveShadow><boxGeometry args={[stile, h, d]} /><meshStandardMaterial {...doorWhite} /></mesh>
      <mesh geometry={lockStile} position={[w / 2 - stile / 2, 0, 0]} castShadow receiveShadow><meshStandardMaterial {...doorWhite} /></mesh>
      <mesh position={[0, h / 2 - stile / 2, 0]} castShadow receiveShadow><boxGeometry args={[w, stile, d]} /><meshStandardMaterial {...doorWhite} /></mesh>
      {/* solid bottom panel */}
      <mesh position={[0, -h / 2 + botH / 2, 0]} castShadow receiveShadow><boxGeometry args={[w, botH, d]} /><meshStandardMaterial {...doorWhite} /></mesh>
      {/* glass sheet + muntins → 9 lites */}
      <mesh position={[0, gcy, 0]}><boxGeometry args={[gw, gh, 0.02]} /><meshStandardMaterial {...doorGlass} /></mesh>
      {[-gw / 6, gw / 6].map((x, i) => (
        <mesh key={'v' + i} position={[x, gcy, d / 2 - 0.03]}><boxGeometry args={[0.05, gh, 0.05]} /><meshStandardMaterial {...doorWhite} /></mesh>
      ))}
      {[gcy - gh / 6, gcy + gh / 6].map((y, i) => (
        <mesh key={'h' + i} position={[0, y, d / 2 - 0.03]}><boxGeometry args={[gw, 0.05, 0.05]} /><meshStandardMaterial {...doorWhite} /></mesh>
      ))}
    </group>
  )
}

// Diamond-lite door: the full-view door with a single centered diamond window.
function DoorDiamond() {
  const w = DOOR_W, h = DOOR_H, d = DOOR_D
  const slab = useHoledSlab(w, h, DOOR_BORE_X, DOOR_BORE_Y)
  return (
    <group>
      <DoorFrame mat={doorAlu} fw={0.1} fd={0.2} />
      <mesh geometry={slab} castShadow receiveShadow><meshStandardMaterial {...doorWhite} /></mesh>
      <group position={[0, h * 0.12, 0]} rotation={[0, 0, Math.PI / 4]}>
        <mesh position={[0, 0, d / 2 + 0.004]} castShadow><boxGeometry args={[0.98, 0.98, 0.03]} /><meshStandardMaterial {...doorAlu} /></mesh>
        <mesh position={[0, 0, d / 2 + 0.006]}><boxGeometry args={[0.8, 0.8, 0.02]} /><meshStandardMaterial {...doorGlass} /></mesh>
      </group>
    </group>
  )
}

// ── Roll (tape) ─────────────────────────────────────────────────────────────────
function Roll() {
  const r = 0.9, len = 0.9
  const outer = { color: '#eef1f4', metalness: 0.0, roughness: 0.95 }
  return (
    <group rotation={[0, 0, Math.PI / 2]}>
      <mesh castShadow receiveShadow><cylinderGeometry args={[r, r, len, 40]} /><meshStandardMaterial {...outer} /></mesh>
      {/* spiral core */}
      <mesh position={[0, len / 2 + 0.001, 0]}><cylinderGeometry args={[0.18, 0.18, 0.02, 24]} /><meshStandardMaterial color="#c9b18a" roughness={0.9} /></mesh>
      <mesh position={[0, -len / 2 - 0.001, 0]}><cylinderGeometry args={[0.18, 0.18, 0.02, 24]} /><meshStandardMaterial color="#c9b18a" roughness={0.9} /></mesh>
    </group>
  )
}

// ── Moisture barrier (double-bubble roll: white poly outside, foil inside) ───────
// Matched to the supplier photos: the roll lies on its side, the tail unrolls off
// the bottom and lies flat with its foil (inner) face UP, curling loose at the free
// end; ends show the wound film edge around a dark hollow core. The bubble read
// comes from a shared procedural bump map on both faces.
function MoistureBarrier() {
  const r = 0.85, len = 2.6, th = 0.018
  const tailGeo = useMemo(() => {
    const rr = r + 0.012 // the wrap hugs just outside the roll surface
    const pts: [number, number][] = []
    for (const deg of [-128, -116, -104, -92]) {
      const a = (deg * Math.PI) / 180
      pts.push([rr * Math.cos(a), rr * Math.sin(a)])
    }
    pts.push([0.55, -rr], [1.45, -rr], [1.95, -rr + 0.03], [2.25, -rr + 0.14])
    return splitUnderside(extrudeProfile(ribbonShape(pts, th), len * 0.96))
  }, [])
  // Color maps carry the bubble pattern (bump alone washes out under the soft
  // studio light); the gray bump clones add relief on hardware that shows it.
  // One texture tile holds 8×8 bubbles. Cylinder UVs are normalized (repeat ×8
  // bubbles around/along); extrude UVs are in feet (repeat 0.6 → ~2.5" bubbles).
  const maps = useMemo(() => {
    const mk = (bg: string, rim: string, hi: string, ru: number, rv: number) => {
      const t = bubbleTexture(bg, rim, hi).clone()
      t.repeat.set(ru, rv)
      t.needsUpdate = true
      return t
    }
    return {
      bodyWhite: mk('#dcdedc', '#bcbfbc', '#ffffff', 5.5, 2.75),
      bodyBump: mk('#808080', '#6f6f6f', '#e6e6e6', 5.5, 2.75),
      tailFoil: mk('#b9bec5', '#7f8590', '#ffffff', 1.0, 1.0),
      tailWhite: mk('#dcdedc', '#bcbfbc', '#ffffff', 1.0, 1.0),
      tailBump: mk('#808080', '#6f6f6f', '#e6e6e6', 1.0, 1.0),
    }
  }, [])
  // Materials are built imperatively with the maps in the CONSTRUCTOR: the first
  // shader compile then includes USE_MAP for certain (assigning map via props left
  // material.version at 0 and the map never reached the compiled shader).
  const mats = useMemo(() => {
    const white = { color: '#ffffff', metalness: 0.05, roughness: 0.6 }
    const foil = { color: '#ffffff', metalness: 0.62, roughness: 0.38 }
    return {
      body: new THREE.MeshStandardMaterial({ ...white, map: maps.bodyWhite, bumpMap: maps.bodyBump, bumpScale: 0.9 }),
      tailFoil: new THREE.MeshStandardMaterial({ ...foil, map: maps.tailFoil, bumpMap: maps.tailBump, bumpScale: 0.9, side: THREE.DoubleSide }),
      tailWhite: new THREE.MeshStandardMaterial({ ...white, map: maps.tailWhite, bumpMap: maps.tailBump, bumpScale: 0.9, side: THREE.DoubleSide }),
    }
  }, [maps])
  return (
    <group>
      {/* roll body, axis along X */}
      <group rotation={[0, 0, Math.PI / 2]}>
        <mesh material={mats.body} castShadow receiveShadow>
          <cylinderGeometry args={[r, r, len, 44]} />
        </mesh>
        {/* wound film edge + dark hollow core at each end */}
        {[len / 2 + 0.001, -len / 2 - 0.001].map((y) => (
          <group key={y} position={[0, y, 0]}>
            <mesh><cylinderGeometry args={[r * 0.99, r * 0.99, 0.002, 44]} /><meshStandardMaterial color="#e6e8e8" metalness={0.15} roughness={0.7} /></mesh>
            <mesh><cylinderGeometry args={[0.15, 0.15, 0.006, 24]} /><meshStandardMaterial color="#3a3d40" metalness={0.1} roughness={0.9} /></mesh>
          </group>
        ))}
      </group>
      {/* unraveled tail: foil (inside) faces up, white (outside) faces down */}
      <mesh geometry={tailGeo} material={[mats.tailFoil, mats.tailWhite]} rotation={[0, -Math.PI / 2, 0]} castShadow receiveShadow />
    </group>
  )
}

// ── Foam closure strips (die-cut to the L5 panel profile) ───────────────────────
// Solid black foam strips, 2" wide, spanning the full 36" panel coverage: the male
// (inside) closure has a flat base with the L5 profile standing proud to fill the
// ribs from below; the female (outside) closure has the profile cut into its
// underside and a flat top. Major ribs only — real closures don't pick up the pan
// stiffeners. Sold as separate products; the legacy combined SKU shows the pair.
const FOAM_MAT = { color: '#141416', metalness: 0.0, roughness: 1.0 }
const FOAM_W = 2 / 12       // strip width (2")
const FOAM_SKIN = 0.45 / 12 // foam body beyond the profile line

// Close the L5 profile polyline against a flat line: below it → male, above → female.
function foamGeo(kind: 'male' | 'female') {
  const prof = l5Center(5, false)
  const first = prof[0], last = prof[prof.length - 1]
  const yFlat = kind === 'male' ? -FOAM_SKIN : L5_RIB_H + FOAM_SKIN
  const s = new THREE.Shape()
  s.moveTo(first[0], first[1])
  for (const [x, y] of prof.slice(1)) s.lineTo(x, y)
  s.lineTo(last[0], yFlat)
  s.lineTo(first[0], yFlat)
  s.closePath()
  return extrudeProfile(s, FOAM_W)
}

function FoamStripMale() {
  const geo = useMemo(() => foamGeo('male'), [])
  return <mesh geometry={geo} castShadow receiveShadow><meshStandardMaterial {...FOAM_MAT} /></mesh>
}

function FoamStripFemale() {
  const geo = useMemo(() => foamGeo('female'), [])
  return <mesh geometry={geo} castShadow receiveShadow><meshStandardMaterial {...FOAM_MAT} /></mesh>
}

function FoamStrip() {
  const maleGeo = useMemo(() => foamGeo('male'), [])
  const femaleGeo = useMemo(() => foamGeo('female'), [])
  return (
    <group>
      {/* mating pair: male below (ribs up), female floating above with the profile
          cut facing down — the way they sandwich a panel end */}
      <mesh geometry={maleGeo} position={[0, -0.16, 0]} castShadow receiveShadow><meshStandardMaterial {...FOAM_MAT} /></mesh>
      <mesh geometry={femaleGeo} position={[0, 0.12, 0]} castShadow receiveShadow><meshStandardMaterial {...FOAM_MAT} /></mesh>
    </group>
  )
}

// ── Welding nipple (short threaded coupling) ────────────────────────────────────
function Nipple({ colorName }: ModelProps) {
  const steel = useSteel(colorName, '#a7adb3')
  const R = 0.28, len = 0.9
  const geo = useMemo(() => {
    const shape = new THREE.Shape(); shape.absarc(0, 0, R, 0, Math.PI * 2, false)
    const hole = new THREE.Path(); hole.absarc(0, 0, R - 0.09, 0, Math.PI * 2, true)
    shape.holes.push(hole)
    return extrudeProfile(shape, len)
  }, [])
  return (
    <group rotation={[0, Math.PI / 2, 0]}>
      <mesh geometry={geo} castShadow receiveShadow><meshStandardMaterial {...steel} side={THREE.DoubleSide} /></mesh>
      {Array.from({ length: 9 }).map((_, i) => (
        <mesh key={i} position={[0, 0, -len / 2 + 0.06 + i * 0.09]}>
          <torusGeometry args={[R + 0.004, 0.012, 6, 28]} /><meshStandardMaterial {...steel} />
        </mesh>
      ))}
    </group>
  )
}

// ── Bundle (strapped stack of brackets) ─────────────────────────────────────────
function Bundle({ colorName }: ModelProps) {
  const steel = useSteel(colorName, '#7f8489')
  const strap = { color: '#2b2f33', metalness: 0.2, roughness: 0.8 }
  const w = 1.8, h = 1.1, d = 1.4
  return (
    <group>
      <mesh castShadow receiveShadow><boxGeometry args={[w, h, d]} /><meshStandardMaterial {...steel} /></mesh>
      {/* segment lines to read as stacked pieces */}
      {[-0.3, 0, 0.3].map((y) => (
        <mesh key={y} position={[0, y * h, d / 2 + 0.002]}><boxGeometry args={[w * 0.98, 0.02, 0.01]} /><meshStandardMaterial color="#4b5157" /></mesh>
      ))}
      {[-0.5, 0.5].map((x) => (
        <mesh key={x} position={[x, 0, 0]}><boxGeometry args={[0.06, h + 0.03, d + 0.03]} /><meshStandardMaterial {...strap} /></mesh>
      ))}
    </group>
  )
}

// ── Generic crate (fallback) ────────────────────────────────────────────────────
function GenericBox({ colorName }: ModelProps) {
  const steel = useSteel(colorName, '#9aa0a6')
  const edge = { color: '#5b6167', metalness: 0.5, roughness: 0.6 }
  const w = 1.6, h = 1.2, d = 1.2
  const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d))
  return (
    <group>
      <mesh castShadow receiveShadow><boxGeometry args={[w, h, d]} /><meshStandardMaterial {...steel} /></mesh>
      <lineSegments geometry={edges}><lineBasicMaterial color={edge.color} /></lineSegments>
    </group>
  )
}

// ── Dispatcher ───────────────────────────────────────────────────────────────────
const REGISTRY: Record<Archetype, React.ComponentType<ModelProps>> = {
  'square-tube': SquareTube,
  'brace': Brace,
  'plate': Plate,
  'base-rail': BaseRail,
  'panel': Panel,
  'skylight': Skylight,
  'trim-l': TrimL,
  'trim-j': TrimJ,
  'trim-corner': TrimCorner,
  'trim-side-vert': TrimSideVert,
  'trim-flashing': TrimFlashing,
  'trim-box-eve': TrimBoxEve,
  'ridge-cap': RidgeCap,
  'hat-channel': HatChannel,
  'l-bracket': LBracket,
  'rebar': Rebar,
  'screw': Screw,
  'screw-bare': ScrewBare,
  'anchor': Anchor,
  'asphalt-anchor': AsphaltAnchor,
  'wedge-anchor': WedgeAnchor,
  'titen-hd': TitenHD,
  'auger-anchor': AugerAnchor,
  'hex-bolt': HexBolt,
  'door-knob': DoorKnob,
  'hinge': Hinge,
  'door-hardware': DoorHardware,
  'door-hardware-lever': DoorHardwareLever,
  'truss': Truss,
  'window': Window,
  'window-grid': WindowGrid,
  'garage-door': GarageDoor,
  'walkin-door': WalkinDoor,
  'walkin-door-hd': WalkinDoorHD,
  'door-fullview': DoorFullView,
  'door-cottage': DoorCottage,
  'door-diamond': DoorDiamond,
  'roll': Roll,
  'moisture-barrier': MoistureBarrier,
  'foam-strip': FoamStrip,
  'foam-male': FoamStripMale,
  'foam-female': FoamStripFemale,
  'nipple': Nipple,
  'bundle': Bundle,
  'box': GenericBox,
}

export function ProductModel({ archetype, colorName, params }: { archetype: Archetype } & ModelProps) {
  const Comp = REGISTRY[archetype] ?? GenericBox
  return <Comp colorName={colorName} params={params} />
}
