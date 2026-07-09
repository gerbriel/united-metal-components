// Framework-free types for the carport material calculator.
// Shared by the dashboard tool and (later) the public calculator.

export type RoofStyle = 'standard' | 'horizontal' | 'vertical'
export type WallOrientation = 'horizontal' | 'vertical'
export type Certification = 'uncertified' | 'local_code'
export type Bracing = 'none' | 'diagonal'
export type LegStyle = 'auto' | 'single' | 'double' | 'ladder' | 'zigzag'
export type LegType = 'standard' | 'double' | 'ladder' | 'zigzag'
export type TrussType = 'single' | 'double'

export interface RollUpDoor {
  width: number // ft
  height: number // ft
}

export interface CarportInput {
  roofStyle: RoofStyle
  width: number // building width, ft (gable direction)
  length: number // building length, ft
  legHeight: number // ft
  pitch: number // roof rise per 12 (e.g. 3 = 3/12)
  wallOrientation: WallOrientation
  encloseSides: boolean // both side walls sheeted
  encloseEnds: boolean // both end walls sheeted
  // Design loads (optional — default 30 psf ground snow / 105 mph). These drive the
  // stamped Table 4 frame spacing + Table 5 purlin/girt + Table 8-A end-post + anchors.
  groundSnow?: number // psf (ground snow / roof-live load row)
  windSpeed?: number // mph (Vult, Exposure C)
  roofColor: string
  wallColor: string
  trimColor: string
  // Engineering. Certified (Built To Local Code) tightens frame spacing to ≤4′ and
  // makes diagonal sway bracing mandatory. Bracing is otherwise the user's choice
  // (but also auto-forced when wind ≥ 140 mph).
  certification?: Certification
  bracing?: Bracing
  // Extra trusses/bows added beyond the code-required minimum. When > 0 the frames
  // are justified (spread evenly) across the length, tightening the on-center spacing.
  extraTrusses?: number
  // "Extra Purlins" option — tightens roof purlin spacing to ≤18″ (mirrors the builder).
  extraPurlins?: boolean
  // Frame tube gauge — 12 (standard, heavier steel) | 14 (lighter). 12ga counts as
  // heavy-duty → double legs (mirrors the builder, whose default is 12).
  gauge?: 12 | 14
  // Leg style override — 'auto' (default) derives from width/height/gauge/certification.
  legStyle?: LegStyle
  // openings
  walkDoors: number
  windows: number
  rollUps: RollUpDoor[]
}

export type BomCategory =
  | 'Roof'
  | 'Walls'
  | 'Trim'
  | 'Structure'
  | 'Fasteners'
  | 'Openings'

export interface BomLine {
  category: BomCategory
  item: string
  qty: number
  unit: string // 'panels' | 'pieces' | 'ft' | 'boxes' | 'each'
  color?: string // finish color, when the line carries one (shopping-list column)
  size?: string // length / size for the shopping-list column, e.g. 9'0" or 6"
  detail?: string // remaining engineering notes (spacing, chart refs, etc.)
  sku?: string // maps to a real product where applicable
}

export interface BomResult {
  lines: BomLine[]
  meta: {
    peakHeight: number // ft
    peakHeightLabel: string // e.g. 9'3"
    roofPanelCount: number
    roofPanelLengthLabel: string
    bays: number
    trusses: number // total frames placed (code-required + extra)
    baseTrusses: number // code-required minimum from the frame-spacing chart
    extraTrusses: number // additional frames the user requested
    totalPanels: number
    frameSpacingFt: number // actual on-center spacing after justifying the frames
    frameSpacingMaxFt: number // governing max spacing (chart, or ≤4′ when certified)
    frameChart: string | null // which width chart drove it ('12'..'30', null = widespan)
    loadAllowed: boolean // false when the load/wind/eave/width cell is "not permitted"
    structuralScrews: number // total #12 structural (frame-to-frame) screws
    // Engineering package (auto-derived from the loads + certification)
    certified: boolean
    purlinSpacingFt: number // resolved roof purlin o.c.
    girtSpacingFt: number // resolved wall girt o.c.
    bracing: Bracing // resolved diagonal sway bracing
    bracingRecommended: boolean // recommended by size/loads even when not mandatory
    bracingReason: string // why bracing is on/off (for the readout)
    // Leg / truss regimes (mirrors the builder's deriveStructure)
    widespan: boolean // width > 30′ (beyond the generic charts)
    legType: LegType // resolved column construction
    trussType: TrussType // single or doubled (paired) truss
    webPanels: number // web members per half-truss (1 = king post only)
    endLegType: LegType // end-wall post construction (double at 13′+ eave)
    legReason: string // why the leg type was chosen (for the readout)
    trussReason: string // why the truss type was chosen (for the readout)
  }
  warnings: string[]
}
