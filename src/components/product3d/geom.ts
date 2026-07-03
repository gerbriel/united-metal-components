import * as THREE from 'three'
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { COLORS } from '@/lib/product-config'

// ── Color resolution ──────────────────────────────────────────────────────────
// Product colors are stored by NAME (see product-config COLORS). Map a name → hex
// for the 3D material. Unknown / null → bare galvanized steel.
export const BARE_STEEL = '#b8bcc0'

const COLOR_BY_NAME: Record<string, string> = Object.fromEntries(
  COLORS.map((c) => [c.name.toLowerCase(), c.hex]),
)

export function colorHex(name?: string | null, fallback = BARE_STEEL): string {
  if (!name) return fallback
  return COLOR_BY_NAME[name.toLowerCase()] ?? fallback
}

// A name reads as bare/metallic finish (galvalume, zinc, bare steel) → shinier.
export function isMetallicFinish(name?: string | null): boolean {
  if (!name) return true
  const n = name.toLowerCase()
  return n.includes('galvalume') || n.includes('galvanized') || n.includes('bare') || n.includes('zinc')
}

// Standard-material params: painted steel is matte; bare/galvalume is polished.
export function steelMaterialProps(name?: string | null) {
  return isMetallicFinish(name)
    ? { metalness: 0.9, roughness: 0.28 }
    : { metalness: 0.55, roughness: 0.42 }
}

// ── Folded sheet-metal profiles (ported from the Carports builder) ──────────────
// Turn an OPEN centreline polyline into a thin CLOSED ribbon (centreline ± half the
// sheet thickness) so a bent-sheet cross-section extrudes into a real solid with
// visible thickness on every face. Points are [x, y] in feet.
export function ribbonShape(center: [number, number][], thickness = 0.03): THREE.Shape {
  const n = center.length
  const nrm = center.map((p, i) => {
    const a = center[Math.max(0, i - 1)]
    const b = center[Math.min(n - 1, i + 1)]
    const tx = b[0] - a[0]
    const ty = b[1] - a[1]
    const l = Math.hypot(tx, ty) || 1
    return [-ty / l, tx / l] as [number, number]
  })
  const off = (sign: number) =>
    center.map((p, i) => [
      p[0] + sign * nrm[i][0] * thickness / 2,
      p[1] + sign * nrm[i][1] * thickness / 2,
    ] as [number, number])
  const top = off(1)
  const bot = off(-1)
  const s = new THREE.Shape()
  s.moveTo(top[0][0], top[0][1])
  for (let i = 1; i < n; i++) s.lineTo(top[i][0], top[i][1])
  for (let i = n - 1; i >= 0; i--) s.lineTo(bot[i][0], bot[i][1])
  s.closePath()
  return s
}

// Extrude a cross-section shape a given depth along +Z (no bevel), recentred on Z.
export function extrudeProfile(shape: THREE.Shape, depth: number): THREE.ExtrudeGeometry {
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1 })
  geo.translate(0, 0, -depth / 2) // centre the run on the origin
  geo.computeVertexNormals()
  return geo
}

// Split a panel solid into two material groups — 0: faces seen from above / the
// sides, 1: the underside — so painted sheets can show an off-white backer coat.
// Returns a non-indexed copy with its triangles reordered into the two groups.
export function splitUnderside(src: THREE.BufferGeometry, cutoff = -0.35): THREE.BufferGeometry {
  const flat = src.index ? src.toNonIndexed() : src
  const pos = flat.getAttribute('position') as THREE.BufferAttribute
  const uv = flat.getAttribute('uv') as THREE.BufferAttribute | undefined
  const arr = pos.array as Float32Array
  const up: number[] = []
  const down: number[] = []
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3()
  const ab = new THREE.Vector3(), ac = new THREE.Vector3(), n = new THREE.Vector3()
  for (let t = 0; t < pos.count / 3; t++) {
    a.fromBufferAttribute(pos, t * 3)
    b.fromBufferAttribute(pos, t * 3 + 1)
    c.fromBufferAttribute(pos, t * 3 + 2)
    n.crossVectors(ab.subVectors(b, a), ac.subVectors(c, a)).normalize()
    ;(n.y < cutoff ? down : up).push(t)
  }
  const out = new Float32Array(arr.length)
  const uvArr = uv ? (uv.array as Float32Array) : null
  const uvOut = uvArr ? new Float32Array(uvArr.length) : null
  let o = 0
  for (const t of [...up, ...down]) {
    out.set(arr.subarray(t * 9, t * 9 + 9), o * 9)
    if (uvOut && uvArr) uvOut.set(uvArr.subarray(t * 6, t * 6 + 6), o * 6)
    o += 1
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(out, 3))
  if (uvOut) geo.setAttribute('uv', new THREE.BufferAttribute(uvOut, 2))
  geo.addGroup(0, up.length * 3, 0)
  geo.addGroup(up.length * 3, down.length * 3, 1)
  geo.computeVertexNormals()
  return geo
}

// ── Bubble-wrap texture (procedural raw-pixel DataTexture, cached per palette) ───
// An offset grid of soft domes: highlight peak → film background → shaded rim.
// Built as raw RGBA pixels (no 2D canvas → survives software/headless GL, where
// canvas uploads can silently fail). Used as BOTH a color map and a bumpMap so the
// moisture-barrier roll reads as double-bubble foil/poly without heavy geometry.
// Clone per material to set a different repeat (clones share the pixel source).
const bubbleTexCache: Record<string, THREE.DataTexture> = {}
export function bubbleTexture(bg = '#808080', rim = '#6f6f6f', hi = '#e6e6e6'): THREE.DataTexture {
  const key = `${bg}|${rim}|${hi}`
  const hit = bubbleTexCache[key]
  if (hit) return hit
  const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
  const [bgC, rimC, hiC] = [hex(bg), hex(rim), hex(hi)]
  const mix = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t)
  const S = 256, cell = 32, R = cell * 0.42
  const data = new Uint8Array(S * S * 4)
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      // distance to the nearest dome centre in the offset grid (rows stagger by
      // half a cell; grid period divides S, so the texture tiles seamlessly)
      let d = 1e9
      const row0 = Math.floor(y / cell)
      for (let rr = row0 - 1; rr <= row0 + 1; rr++) {
        const ox = rr % 2 ? cell / 2 : 0
        const col0 = Math.floor((x - ox) / cell)
        for (let cc = col0 - 1; cc <= col0 + 1; cc++) {
          d = Math.min(d, Math.hypot(x - (cc * cell + ox), y - rr * cell))
        }
      }
      let col = bgC
      if (d < R) {
        const t = d / R
        col = t < 0.4 ? mix(hiC, bgC, t / 0.4) : mix(bgC, rimC, (t - 0.4) / 0.6)
      }
      const o = (y * S + x) * 4
      data[o] = col[0]; data[o + 1] = col[1]; data[o + 2] = col[2]; data[o + 3] = 255
    }
  }
  const tex = new THREE.DataTexture(data, S, S, THREE.RGBAFormat)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.generateMipmaps = true
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  bubbleTexCache[key] = tex
  return tex
}

// ── Machine-screw thread ─────────────────────────────────────────────────────────
// A helical V-thread built as a thin triangular FIN swept along a helix (root →
// crest → root), so it reads as a machined thread with a sharp crest — not a round
// wire coil. Centered on the origin; the run spans `length` along Y.
export function screwThreadGeometry(
  rootR: number,
  crestR: number,
  length: number,
  turns: number,
  halfBase: number,       // half the fin thickness at the root (axial)
  segsPerTurn = 48,
): THREE.BufferGeometry {
  const steps = Math.floor(turns * segsPerTurn)
  const positions: number[] = []
  const indices: number[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const a = 2 * Math.PI * turns * t
    const y = length * t - length / 2
    const cos = Math.cos(a)
    const sin = Math.sin(a)
    // Fade the crest in/out over the first/last quarter-turn so the thread
    // starts and ends flush with the shaft instead of stopping mid-air.
    const fade = Math.min(1, Math.min(t, 1 - t) * turns * 4)
    const cr = rootR + (crestR - rootR) * fade
    const section: [number, number][] = [
      [rootR * 0.98, -halfBase],  // lower root
      [cr, 0],                    // crest
      [rootR * 0.98, halfBase],   // upper root
    ]
    for (const [r, dy] of section) positions.push(r * cos, y + dy, r * sin)
  }
  for (let i = 0; i < steps; i++) {
    const base = i * 3
    for (let k = 0; k < 2; k++) {   // lower flank + upper flank
      const a0 = base + k, a1 = base + k + 1
      const b0 = base + 3 + k, b1 = base + 3 + k + 1
      indices.push(a0, b0, a1, a1, b0, b1)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

// ── Self-drilling (Tek) drill point ──────────────────────────────────────────────
// Modeled on the real ground part (close-up reference): a LONG prismatic pilot — a
// cylinder with TWO parallel milled FLATS (double-D section) — with an almond-shaped
// gash scooped into each flat (deepest mid-run, fading to nothing at both ends),
// terminating in a SHORT sharp pyramid grind: the whole cross-section shrinks
// linearly to a centre point, so the flats become crisp triangular facets.
// Local Y: pilot top at +pilotLen, tip point at -tipLen, axis through the origin.
export function drillPointGeometry(
  R = 0.05,
  pilotLen = 0.14,
  tipLen = 0.07,
  radialSegs = 64,
  rings = 48,
  flatFrac = 0.72,   // distance of each milled flat from the axis (× R)
  gashDepth = 0.45,  // almond-gash depth into each flat (× R)
  twist = 0,         // optional spiral of the flats (the real part is ~straight)
): THREE.BufferGeometry {
  const positions: number[] = []
  const indices: number[] = []
  const total = pilotLen + tipLen
  const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t))
  const T = R * flatFrac
  for (let j = 0; j <= rings; j++) {
    const y = pilotLen - (j / rings) * total
    const p = y < 0 ? Math.min(1, -y / tipLen) : 0   // pyramid-grind progress
    const k = 1 - p                                   // cross-section → the point
    // The gash opens below the threads, reaches full depth mid-pilot, and RUNS
    // THROUGH the grind to the very point — the dark triangle in the reference:
    // the tip is a pyramid WITH the gash cut through it, not a solid pyramid.
    // (It pinches to nothing at the point only because the section scales to 0.)
    const g0 = pilotLen * 0.85
    const gPeak = pilotLen * 0.5
    const gy = y < g0 ? smooth((g0 - y) / (g0 - gPeak)) : 0
    const thetaC = twist * (pilotLen - Math.max(y, 0))
    const vx = Math.cos(thetaC)                       // flat-normal axis
    const vz = Math.sin(thetaC)
    const wx = -vz                                    // across-the-flat axis
    const wz = vx
    for (let i = 0; i < radialSegs; i++) {
      const th = (i / radialSegs) * Math.PI * 2
      const cx = R * Math.cos(th)
      const cz = R * Math.sin(th)
      let v = cx * vx + cz * vz
      const w = cx * wx + cz * wz
      // mill the two parallel flats (double-D cross-section)
      const over = Math.abs(v) - T
      if (over > 0) {
        // depth into the flat: 0 at the flat's edge → 1 at the face centre; the
        // gash carves deepest there, giving the almond-shaped scoop of the photos
        const depth = smooth(over / (R - T))
        v = Math.sign(v) * (T - gashDepth * R * gy * depth)
      }
      positions.push((vx * v + wx * w) * k, y, (vz * v + wz * w) * k)
    }
  }
  for (let j = 0; j < rings; j++) {
    for (let i = 0; i < radialSegs; i++) {
      const a = j * radialSegs + i
      const b = j * radialSegs + ((i + 1) % radialSegs)
      const c = (j + 1) * radialSegs + i
      const d = (j + 1) * radialSegs + ((i + 1) % radialSegs)
      indices.push(a, c, b, b, c, d)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  // Crease normals at hard edges (~20°+) so the pyramid facets and the grind
  // shoulder shade FLAT and solid — smooth normals made the tip read hollow.
  return toCreasedNormals(geo, Math.PI / 9)
}

// ── L5 panel profile (the stocked sheet profile) ────────────────────────────────
// ¾"-tall trapezoidal major ribs on 9" centers, two shallow stiffener ribs across
// each flat pan, and a short side-lap flange outside the edge ribs. A full
// 36"-coverage sheet carries a rib at each edge — five majors in all, hence "L5".
// Returns the cross-section centreline polyline in feet, centred on x=0; extrude
// along the sheet length to get true 3D corrugation.
export const L5_PITCH = 9 / 12      // major rib spacing (9" o.c.)
export const L5_RIB_H = 0.75 / 12   // major rib height (¾")

export function l5Center(ribs = 5, stiffeners = true): [number, number][] {
  const base = 1.3 / 12    // major rib width at the pan
  const crest = 0.5 / 12   // major rib width at the crown
  const edge = 0.4 / 12    // flat side-lap flange outside the edge ribs
  const stifH = 0.14 / 12  // stiffener rib height
  const stifW = 0.9 / 12   // stiffener rib width at the pan

  const w = (ribs - 1) * L5_PITCH + base + 2 * edge
  const x0 = -w / 2
  const pts: [number, number][] = [[x0, 0]]
  const bump = (cx: number, bw: number, cw: number, h: number) => {
    pts.push([cx - bw / 2, 0], [cx - cw / 2, h], [cx + cw / 2, h], [cx + bw / 2, 0])
  }
  for (let i = 0; i < ribs; i++) {
    const cx = x0 + edge + base / 2 + i * L5_PITCH
    bump(cx, base, crest, L5_RIB_H)
    if (stiffeners && i < ribs - 1) {
      // two stiffeners split each pan into thirds
      bump(cx + L5_PITCH / 3, stifW, stifW * 0.35, stifH)
      bump(cx + (2 * L5_PITCH) / 3, stifW, stifW * 0.35, stifH)
    }
  }
  pts.push([x0 + w, 0])
  return pts
}
