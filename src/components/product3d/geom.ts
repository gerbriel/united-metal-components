import * as THREE from 'three'
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { COLORS, finishClassOf, canonicalColorName } from '@/lib/product-config'

// ── Color resolution ──────────────────────────────────────────────────────────
// Product colors are stored by NAME (see product-config COLORS). Map a name → hex
// for the 3D material. Unknown / null → bare galvanized steel.
export const BARE_STEEL = '#b8bcc0'

const COLOR_BY_NAME: Record<string, string> = Object.fromEntries(
  COLORS.map((c) => [c.name.toLowerCase(), c.hex]),
)

export function colorHex(name?: string | null, fallback = BARE_STEEL): string {
  if (!name) return fallback
  // canonicalColorName maps renamed finishes (e.g. stored "Hawaiian Blue" rows)
  // onto the current palette entry.
  return COLOR_BY_NAME[canonicalColorName(name).trim().toLowerCase()] ?? fallback
}

// A name reads as bare/metallic finish (galvalume, zinc, bare steel) → shinier.
// finishClass is the source of truth (galvalume = bare/metallic); the substring
// terms stay as a secondary fallback for off-palette names (galvanized/bare/zinc)
// so nothing regresses.
export function isMetallicFinish(name?: string | null): boolean {
  if (!name) return true
  // Canonicalize first: legacy "Zinc Gray" rows must NOT hit the 'zinc' substring
  // fallback (it's a painted solid, renamed Quaker Gray) — only true bare finishes.
  const lowerName = canonicalColorName(name).toLowerCase()
  return finishClassOf(lowerName) === 'galvalume' || /galvalume|galvanized|bare|zinc/.test(lowerName)
}

// Standard-material params. Painted steel is matte. Bare/galvalume is hot-dip
// mill finish — matte and grainy, NOT a polished mirror: mostly-metal but rough,
// so it reads light and diffuse instead of reflecting the dark env backdrop.
// Pair with spangleTexture() on sheet products for the speckled crystallite look.
export function steelMaterialProps(name?: string | null) {
  return isMetallicFinish(name)
    ? { metalness: 0.72, roughness: 0.52 }
    : { metalness: 0.55, roughness: 0.42 }
}

// ── Printed stone-look finishes (texture map) ───────────────────────────────────
// A few finishes (Light Rock, Dark Stone) are a PRINTED PATTERN, not a solid color:
// artwork printed on the flat coil, then roll-formed, so it hugs the ribs. Those
// COLORS entries carry a `texture` url; a panel in one of those finishes renders the
// image as a `map` (see models.tsx Panel) with developedPanelUV() below so the print
// flows over the corrugation. `hex` stays the swatch color + no-texture fallback.
const TEXTURE_BY_NAME: Record<string, string> = Object.fromEntries(
  COLORS.filter((c) => c.texture).map((c) => [c.name.toLowerCase(), c.texture!]),
)

// Real-world run-length (feet) covered by one full print tile. The panel UVs are in
// feet (developed width × run length), so this sets the apparent stone size; the
// cross-axis repeat is derived from the image aspect so stones aren't stretched.
// One knob to tune the look — smaller = larger stones / fewer repeats.
export const PRINT_FEET_PER_TILE = 5

// Cache one THREE.Texture per url (shared across every panel + thumbnail canvas —
// three uploads it per-renderer, so one Texture object is safe to reuse).
const printedTexCache: Record<string, THREE.Texture> = {}

export function printedTexture(url: string): THREE.Texture {
  const hit = printedTexCache[url]
  if (hit) return hit
  const setRepeat = (tex: THREE.Texture, aspectHW: number) =>
    // V = run length (1 tile / PRINT_FEET_PER_TILE ft); U derived from H/W so the
    // stone keeps its proportions across the developed width.
    tex.repeat.set(aspectHW / PRINT_FEET_PER_TILE, 1 / PRINT_FEET_PER_TILE)
  const tex = new THREE.TextureLoader().load(url, (t) => {
    const img = t.image as { width: number; height: number } | undefined
    if (img?.width) setRepeat(t, img.height / img.width)
    t.needsUpdate = true
  })
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  // No mipmaps + linear filtering: this project targets software/headless GL stacks
  // that sample mipmapped textures as their 1×1 average (see bubbleTexture) — the
  // print would vanish. Keeps the pattern visible everywhere at some aliasing cost.
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearFilter
  tex.generateMipmaps = false
  setRepeat(tex, 900 / 550) // provisional (portrait) until the image reports its size
  printedTexCache[url] = tex
  return tex
}

// Texture for a finish NAME, or null if that finish isn't a printed pattern.
// finishClass decides whether the finish is a printed pattern; the image URL still
// comes from the color's `texture` field via TEXTURE_BY_NAME.
export function colorTexture(name?: string | null): THREE.Texture | null {
  if (!name || finishClassOf(name) !== 'pattern') return null
  const url = TEXTURE_BY_NAME[canonicalColorName(name).trim().toLowerCase()]
  return url ? printedTexture(url) : null
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

// A true 180° hem fold (the "eyelet" on a trim edge): at the sheet edge the metal
// wraps a tight semicircular fold and runs back parallel to the face on one side —
// the elongated loop in the factory profile drawings. Returns the centreline points
// AFTER the edge point: the fold arc, then the return-leg end. `prev` fixes the
// direction of travel into the edge; `side` picks which face the hem folds back
// onto (+1 = left of travel prev→edge, -1 = right). Centreline separation across
// the fold is 1.5× the sheet thickness (open hem: a half-thickness air gap), which
// keeps the ribbon's inner fold radius positive — a straight-stub hem here made the
// offset outline balloon into a bubble at the fold.
export function hemFold(
  prev: [number, number],
  edge: [number, number],
  hemLen: number,
  side: 1 | -1,
  thickness: number,
  segments = 6,
): [number, number][] {
  const dx = edge[0] - prev[0], dy = edge[1] - prev[1]
  const l = Math.hypot(dx, dy) || 1
  const d: [number, number] = [dx / l, dy / l]
  const p: [number, number] = [-side * d[1], side * d[0]]  // unit normal, fold side
  const r = (1.5 * thickness) / 2                          // centreline fold radius
  const c: [number, number] = [edge[0] + p[0] * r, edge[1] + p[1] * r]
  const pts: [number, number][] = []
  for (let i = 1; i <= segments; i++) {
    const th = (Math.PI * i) / segments
    pts.push([
      c[0] - p[0] * r * Math.cos(th) + d[0] * r * Math.sin(th),
      c[1] - p[1] * r * Math.cos(th) + d[1] * r * Math.sin(th),
    ])
  }
  // return leg: back along the face, hem length measured from the fold
  pts.push([edge[0] + p[0] * 2 * r - d[0] * hemLen, edge[1] + p[1] * 2 * r - d[1] * hemLen])
  return pts
}

// Build a trim centreline from its bare FACE polyline plus true 180° hem folds
// (hemFold) at either free end. Hem lengths/sides come from the profile spec.
export function hemmedProfile(
  face: [number, number][],
  thickness: number,
  hems: { start?: { len: number; side: 1 | -1 }; end?: { len: number; side: 1 | -1 } },
): [number, number][] {
  const pts: [number, number][] = [...face]
  if (hems.end) {
    pts.push(...hemFold(face[face.length - 2], face[face.length - 1], hems.end.len, hems.end.side, thickness))
  }
  if (hems.start) {
    pts.unshift(...hemFold(face[1], face[0], hems.start.len, hems.start.side, thickness).reverse())
  }
  return pts
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

// Split a FOLDED trim solid into two material groups by SHEET FACE — 0: the exterior
// (finish) face, 1: the interior (backer) face — so trim shows the painted/printed
// finish outside and the off-white backer coat inside, exactly like a panel. Trim
// bends every which way, so the panel's world-down test doesn't apply; instead we
// rebuild the ribbon's two offset polylines (one sheet-thickness apart) and assign
// each triangle to whichever its centroid is nearer. By default exterior = the
// LONGER offset (the convex/outer side of the bends) — but a 180° hem fold adds a
// half-turn of wrap that can swing that balance, so callers pass `extSide` to pin
// it: +1 → the left-of-travel offset (ribbonShape's + side) is the finish face,
// -1 → the right. Pass the SAME centreline + thickness used for the ribbon.
export function splitSheetFaces(
  src: THREE.BufferGeometry,
  center: [number, number][],
  thickness = 0.02,
  extSide?: 1 | -1,
): THREE.BufferGeometry {
  const n = center.length
  const nrm = center.map((p, i) => {
    const a = center[Math.max(0, i - 1)]
    const b = center[Math.min(n - 1, i + 1)]
    const tx = b[0] - a[0], ty = b[1] - a[1]
    const l = Math.hypot(tx, ty) || 1
    return [-ty / l, tx / l] as [number, number]
  })
  const off = (sign: number) =>
    center.map((p, i) => [
      p[0] + sign * nrm[i][0] * thickness / 2,
      p[1] + sign * nrm[i][1] * thickness / 2,
    ] as [number, number])
  const top = off(1), bot = off(-1)
  const plen = (poly: [number, number][]) => {
    let s = 0
    for (let i = 1; i < poly.length; i++) s += Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1])
    return s
  }
  const ext = extSide ? (extSide > 0 ? top : bot) : plen(top) >= plen(bot) ? top : bot
  const int = ext === top ? bot : top              // the other face → backer
  const distSq = (x: number, y: number, poly: [number, number][]) => {
    let best = Infinity
    for (let i = 1; i < poly.length; i++) {
      const ax = poly[i - 1][0], ay = poly[i - 1][1]
      const dx = poly[i][0] - ax, dy = poly[i][1] - ay
      const len2 = dx * dx + dy * dy || 1
      let u = ((x - ax) * dx + (y - ay) * dy) / len2
      u = u < 0 ? 0 : u > 1 ? 1 : u
      const px = ax + u * dx, py = ay + u * dy
      const d = (x - px) ** 2 + (y - py) ** 2
      if (d < best) best = d
    }
    return best
  }

  const flat = src.index ? src.toNonIndexed() : src
  const pos = flat.getAttribute('position') as THREE.BufferAttribute
  const uv = flat.getAttribute('uv') as THREE.BufferAttribute | undefined
  const arr = pos.array as Float32Array
  const uvArr = uv ? (uv.array as Float32Array) : null
  const exterior: number[] = [], interior: number[] = []
  for (let t = 0; t < pos.count / 3; t++) {
    const cx = (arr[t * 9] + arr[t * 9 + 3] + arr[t * 9 + 6]) / 3   // centroid XY
    const cy = (arr[t * 9 + 1] + arr[t * 9 + 4] + arr[t * 9 + 7]) / 3
    ;(distSq(cx, cy, ext) <= distSq(cx, cy, int) ? exterior : interior).push(t)
  }
  const out = new Float32Array(arr.length)
  const uvOut = uvArr ? new Float32Array(uvArr.length) : null
  let o = 0
  for (const t of [...exterior, ...interior]) {
    out.set(arr.subarray(t * 9, t * 9 + 9), o * 9)
    if (uvOut && uvArr) uvOut.set(uvArr.subarray(t * 6, t * 6 + 6), o * 6)
    o += 1
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(out, 3))
  if (uvOut) geo.setAttribute('uv', new THREE.BufferAttribute(uvOut, 2))
  geo.addGroup(0, exterior.length * 3, 0)
  geo.addGroup(exterior.length * 3, interior.length * 3, 1)
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
        // dome: broad highlight core easing to the film, narrow shaded rim at the edge
        const t = d / R
        col = t < 0.68 ? mix(hiC, bgC, t / 0.68) : mix(bgC, rimC, (t - 0.68) / 0.32)
      }
      const o = (y * S + x) * 4
      data[o] = col[0]; data[o + 1] = col[1]; data[o + 2] = col[2]; data[o + 3] = 255
    }
  }
  const tex = new THREE.DataTexture(data, S, S, THREE.RGBAFormat)
  // NO mipmaps, plain linear filtering: this GL context (SwiftShader headless and
  // some software stacks) samples every mipmapped texture as its 1x1 average —
  // the pattern vanishes entirely. Keep repeats moderate to limit aliasing.
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearFilter
  tex.generateMipmaps = false
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  bubbleTexCache[key] = tex
  return tex
}

// ── Galvalume spangle (procedural speckled DataTexture, cached) ─────────────────
// Real galvalume/galvanized sheet is a field of zinc crystallites ("spangle"):
// per-grain tone variation with fine speckle, not a uniform silver. A tileable
// grayscale map — a grid of grains, each with a hashed brightness, plus per-pixel
// grain and sparse sparkle/pit flecks. Values sit near white so the material's
// hex tint multiplies through. Use as BOTH color map and bumpMap on bare sheet
// steel. Deterministic hash (no Math.random) → identical across every canvas.
// Raw RGBA pixels, no mipmaps — same headless-GL constraints as bubbleTexture.
// UV space on panels/trim is feet; repeat is baked so a grain reads ~½" wide.
let spangleTex: THREE.DataTexture | null = null
export function spangleTexture(): THREE.DataTexture {
  if (spangleTex) return spangleTex
  const S = 256, cell = 16                       // 16 divides 256 → seamless tile
  const hash = (x: number, y: number) => {
    let h = (x * 374761393 + y * 668265263) ^ 0x5bf03635
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295
  }
  const data = new Uint8Array(S * S * 4)
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const grain = hash(Math.floor(x / cell), Math.floor(y / cell))  // per-grain tone
      const fleck = hash(x, y)                                        // fine speckle
      let v = 208 + grain * 40 + (fleck - 0.5) * 28                   // ≈194–255
      if (fleck > 0.985) v = 255                                      // sparse sparkle
      else if (fleck < 0.012) v -= 34                                 // sparse dark pit
      const b = Math.max(0, Math.min(255, Math.round(v)))
      const o = (y * S + x) * 4
      data[o] = b; data[o + 1] = b; data[o + 2] = b; data[o + 3] = 255
    }
  }
  const tex = new THREE.DataTexture(data, S, S, THREE.RGBAFormat)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(2, 2)                            // UVs are feet → grain ≈ 0.4"
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearFilter
  tex.generateMipmaps = false
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  spangleTex = tex
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

// ── Developed-surface UVs for a printed panel (printed-coil look) ────────────────
// Faux-stone panels are printed on the FLAT coil, then roll-formed — so the artwork
// runs continuously across the unrolled sheet and up-and-over every rib without
// distorting on the rib flanks. Reproduce that by replacing the panel's UVs with:
//   U = arc length along the cross-section centreline (the developed width, feet)
//   V = distance along the run (feet, = the extrude/Z axis)
// Feed the SAME centreline used to build the ribbon. Its x is monotonic left→right
// (each rib/stiffener bump advances x), so developed length is a function of x —
// which every vertex (top face, flanks, underside) shares consistently. Apply BEFORE
// splitUnderside so the split copies these UVs through. Returns the same geometry.
export function developedPanelUV(
  geo: THREE.BufferGeometry,
  center: [number, number][],
): THREE.BufferGeometry {
  const xs = [center[0][0]]
  const ss = [0]
  let s = 0
  for (let i = 1; i < center.length; i++) {
    s += Math.hypot(center[i][0] - center[i - 1][0], center[i][1] - center[i - 1][1])
    xs.push(center[i][0]); ss.push(s)
  }
  const sOfX = (x: number): number => {
    if (x <= xs[0]) return ss[0]
    if (x >= xs[xs.length - 1]) return ss[ss.length - 1]
    let lo = 0, hi = xs.length - 1
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (xs[mid] <= x) lo = mid; else hi = mid }
    return ss[lo] + (ss[hi] - ss[lo]) * ((x - xs[lo]) / (xs[hi] - xs[lo] || 1))
  }
  const pos = geo.getAttribute('position') as THREE.BufferAttribute
  const uv = new Float32Array(pos.count * 2)
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = sOfX(pos.getX(i)) // developed width (ft)
    uv[i * 2 + 1] = pos.getZ(i)   // run length (ft)
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  return geo
}
