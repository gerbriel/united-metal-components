// Tunable rule constants for the carport calculator.
//
// The roof-panel rules are VERIFIED against the "Material Cheat Sheet":
//   standard/horizontal: round(width/3)+1 panels; vertical: round(length/3)*2.
// The wall / fastener / structure / opening rules are BEST-GUESS defaults
// derived from the sheet's (inconsistent, hand-entered) lookup tables. Every
// value here is surfaced in the calculator's editable "Assumptions" panel so
// the office can tune them to match real takeoffs.

export interface RuleSet {
  // Panels
  panelCoverage: number // ft of net coverage per panel
  roofPanelBonus: number // extra panels for a width-spanning run (overlap/waste)
  verticalOverhang: number // ft added to half-width for a vertical-roof panel length

  // Trim / caps (stick length in ft)
  trimPieceLength: number
  ridgeCapPieceLength: number

  // Structure
  trussSpacing: number // ft between trusses/bows (fallback when Table 4 not used)
  purlinSpacingFt: number // ft between roof purlins (fallback / override for Table 5.1)
  girtSpacingFt: number // ft between wall girts (fallback / override for Table 5.2)

  // Fasteners
  screwsPerPanel: number
  screwsPerBox: number
  closuresPerWall: number // "insert closures" per enclosed wall
  // Structural (frame-to-frame) #12 self-drill screws
  screwsPurlinToBeam: number // per purlin↔beam crossing
  screwsGirtToPost: number // per girt↔post crossing
  screwsEaveHatChannel: number // per eave hat channel
  screwsPerBracket: number // per angle/straight bracket & clip

  // Openings (per unit)
  doorBrackets: number
  doorJTrim: number
  doorTubingFt: number
  windowTrim: number
  windowTubingFt: number
  windowBrackets: number
  rollUpTubingFt: number

  // Header class by opening width (ft) — single tube ≤ single-max, double ≤ double-max,
  // else C-channel header (per MAX_SPAN = 8·0.6·Fy·S / W).
  headerSingleMaxFt: number
  headerDoubleMaxFt: number
}

export const DEFAULT_RULES: RuleSet = {
  panelCoverage: 3,
  roofPanelBonus: 1,
  verticalOverhang: 1.25, // 1'3"

  trimPieceLength: 11, // all trim sticks are 11'-0" (confirmed from engineering plans)
  ridgeCapPieceLength: 11,

  trussSpacing: 5,
  purlinSpacingFt: 2.5,
  girtSpacingFt: 3.5,

  screwsPerPanel: 40,
  screwsPerBox: 250,
  closuresPerWall: 10,
  screwsPurlinToBeam: 2,
  screwsGirtToPost: 2,
  screwsEaveHatChannel: 6,
  screwsPerBracket: 4,

  doorBrackets: 4,
  doorJTrim: 4,
  doorTubingFt: 13,
  windowTrim: 1,
  windowTubingFt: 13,
  windowBrackets: 18,
  rollUpTubingFt: 13,

  headerSingleMaxFt: 11,
  headerDoubleMaxFt: 16,
}

// Human-readable labels + grouping for the editable Assumptions panel.
export const RULE_FIELDS: {
  key: keyof RuleSet
  label: string
  group: 'Panels' | 'Trim' | 'Structure' | 'Fasteners' | 'Openings'
  suffix?: string
}[] = [
  { key: 'panelCoverage', label: 'Panel coverage', group: 'Panels', suffix: 'ft' },
  { key: 'roofPanelBonus', label: 'Extra roof panels', group: 'Panels' },
  { key: 'verticalOverhang', label: 'Vertical panel overhang', group: 'Panels', suffix: 'ft' },
  { key: 'trimPieceLength', label: 'Trim stick length', group: 'Trim', suffix: 'ft' },
  { key: 'ridgeCapPieceLength', label: 'Ridge cap length', group: 'Trim', suffix: 'ft' },
  { key: 'trussSpacing', label: 'Truss spacing', group: 'Structure', suffix: 'ft' },
  { key: 'screwsPerPanel', label: 'Screws per panel', group: 'Fasteners' },
  { key: 'screwsPerBox', label: 'Screws per box', group: 'Fasteners' },
  { key: 'closuresPerWall', label: 'Closures per wall', group: 'Fasteners' },
  { key: 'doorBrackets', label: 'Brackets / walk door', group: 'Openings' },
  { key: 'doorJTrim', label: 'J-trim / walk door', group: 'Openings' },
  { key: 'doorTubingFt', label: 'Tubing / walk door', group: 'Openings', suffix: 'ft' },
  { key: 'windowTrim', label: 'Trim / window', group: 'Openings' },
  { key: 'windowTubingFt', label: 'Tubing / window', group: 'Openings', suffix: 'ft' },
  { key: 'windowBrackets', label: 'Brackets / window', group: 'Openings' },
  { key: 'rollUpTubingFt', label: 'Tubing / roll-up', group: 'Openings', suffix: 'ft' },
  { key: 'purlinSpacingFt', label: 'Purlin spacing', group: 'Structure', suffix: 'ft' },
  { key: 'girtSpacingFt', label: 'Girt spacing', group: 'Structure', suffix: 'ft' },
  { key: 'screwsPurlinToBeam', label: 'Screws / purlin joint', group: 'Fasteners' },
  { key: 'screwsGirtToPost', label: 'Screws / girt joint', group: 'Fasteners' },
  { key: 'screwsEaveHatChannel', label: 'Screws / eave channel', group: 'Fasteners' },
  { key: 'screwsPerBracket', label: 'Screws / bracket', group: 'Fasteners' },
  { key: 'headerSingleMaxFt', label: 'Single-header max span', group: 'Openings', suffix: 'ft' },
  { key: 'headerDoubleMaxFt', label: 'Double-header max span', group: 'Openings', suffix: 'ft' },
]
