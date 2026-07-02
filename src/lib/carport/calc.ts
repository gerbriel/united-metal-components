// Pure carport bill-of-materials calculator. No React / Next / Supabase imports —
// this is the single source of truth shared by the dashboard and public UIs.
//
// Engineering model per the stamped generic plan sets (tube-framed only):
//  • Frame spacing from the full Table 4 (by width × eave band × enclosure × load ×
//    wind) — see frameSpacing.ts.  • Purlin/girt counts from spacing.  • End-wall
//    posts from Table 8-A.1.  • Structural (frame-to-frame) screws + anchors + a
//    header class chosen by opening width.  Every constant stays editable in rules.ts.

import type { BomLine, BomResult, CarportInput } from './types'
import { DEFAULT_RULES, type RuleSet } from './rules'
import { lookupFrameSpacing } from './frameSpacing'

/** Format a length in feet as feet'inches" (rounded to the nearest inch). */
export function ftIn(ft: number): string {
  const totalInches = Math.round(ft * 12)
  const f = Math.floor(totalInches / 12)
  const i = totalInches % 12
  return i === 0 ? `${f}'` : `${f}'${i}"`
}

const round = (n: number) => Math.round(n)

// Table 8-A.1 — max end-wall post spacing (ft) by wind speed × eave-height band.
function endPostSpacingFt(windSpeed: number, eaveHeight: number): number {
  const band = eaveHeight <= 7 ? 0 : eaveHeight <= 9 ? 1 : 2
  const rows: Array<[number, number[]]> = [
    [105, [5, 5, 5]], [115, [5, 5, 4.5]], [130, [4.5, 4.5, 4]],
    [140, [4.5, 4.5, 3]], [155, [4, 4, 2.5]], [999, [3.5, 3, 2]],
  ]
  for (const [w, vals] of rows) if (windSpeed <= w) return vals[band]
  return 2
}

// Header class by opening width (per MAX_SPAN = 8·0.6·Fy·S / W).
function headerClass(openingWidthFt: number, rules: RuleSet): string {
  if (openingWidthFt <= rules.headerSingleMaxFt) return 'single 2½" tube'
  if (openingWidthFt <= rules.headerDoubleMaxFt) return 'double 2½" tube'
  return '12×3½ C-channel'
}

export function calculateBom(
  input: CarportInput,
  rules: RuleSet = DEFAULT_RULES,
): BomResult {
  const lines: BomLine[] = []
  const warnings: string[] = []

  const {
    roofStyle, width, length, legHeight, pitch, wallOrientation,
    encloseSides, encloseEnds, roofColor, wallColor, trimColor,
    walkDoors, windows, rollUps,
  } = input
  const groundSnow = input.groundSnow ?? 30
  const windSpeed = input.windSpeed ?? 105

  const { panelCoverage, roofPanelBonus, verticalOverhang } = rules
  const cov = panelCoverage > 0 ? panelCoverage : 3

  if (width <= 0 || length <= 0) {
    warnings.push('Enter a building width and length to calculate materials.')
  }

  const hasRidge = roofStyle !== 'standard' // A-frame + vertical have a ridge line
  const pitchAngle = Math.atan((pitch || 0) / 12)
  const rise = roofStyle === 'standard' ? width * (pitch / 12) : (width / 2) * (pitch / 12)
  const peakHeight = legHeight + rise
  // Horizontal run of one rafter, and its true (sloped) length.
  const rafterRun = hasRidge ? width / 2 : width
  const slopeLen = roofStyle === 'vertical'
    ? width / 2 + verticalOverhang
    : rafterRun / Math.max(0.01, Math.cos(pitchAngle))
  const roofBeamsPerFrame = hasRidge ? 2 : 1

  // ---- Frame spacing (Table 4) --------------------------------------------
  const enclosed = encloseSides && encloseEnds
  const vertical = roofStyle === 'vertical'
  let frameSpacingFt = rules.trussSpacing > 0 ? rules.trussSpacing : 5
  let frameChart: string | null = null
  let loadAllowed = true
  const fs = lookupFrameSpacing({
    width, enclosed, eaveHeight: legHeight, groundSnow, windSpeed, vertical,
  })
  if (fs === null) {
    // Width > 30' has no generic chart — keep the editable trussSpacing fallback.
    warnings.push(`${width}' wide is beyond the generic charts (≤30') — spacing is an estimate; needs project-specific engineering.`)
  } else if (!fs.permitted) {
    frameChart = fs.chart
    loadAllowed = false
    warnings.push(`Not permitted: ${width}' @ ${groundSnow} psf / ${windSpeed} mph / ${legHeight}' eave (${enclosed ? 'enclosed' : 'open'}) exceeds the generic charts — needs project-specific engineering.`)
  } else {
    frameSpacingFt = fs.spacingFt as number
    frameChart = fs.chart
  }

  // Certified (Built To Local Code) buildings tighten frame spacing to ≤4′ o.c.,
  // never looser — mirrors the Carports source-of-truth engineering model.
  const certified = input.certification === 'local_code'
  if (certified) frameSpacingFt = Math.min(frameSpacingFt, 4)

  // Code-required minimum frame count from the (max) governing spacing, then any extra
  // trusses the user dictates. Adding extras justifies the frames: they spread evenly
  // across the length, so the real on-center spacing tightens below the chart max.
  const baseFrames = length > 0 ? Math.max(2, Math.ceil(length / frameSpacingFt) + 1) : 0
  const extraTrusses = Math.max(0, Math.floor(input.extraTrusses ?? 0))
  const frames = baseFrames > 0 ? baseFrames + extraTrusses : 0
  const bays = frames > 0 ? frames - 1 : 0
  const maxFrameSpacingFt = frameSpacingFt
  // Actual justified spacing once every frame is placed at equal centers.
  const actualSpacingFt = bays > 0 ? length / bays : frameSpacingFt

  // ---- Diagonal sway bracing (Table / plan bracing rules) ------------------
  // A CERTIFIED build always carries diagonal sway braces, and the plans force them
  // whenever the design wind speed is ≥ 140 mph — so either auto-triggers bracing.
  // Otherwise it follows the user's choice (still recommended on wide/tall/snowy builds).
  const widespan = width > 30
  const highWind = windSpeed >= 140
  const bracingMandatory = certified || highWind
  const bracingRecommended = widespan || legHeight >= 11 || groundSnow >= 30
  const bracing: 'none' | 'diagonal' =
    bracingMandatory || input.bracing === 'diagonal' ? 'diagonal' : 'none'
  const bracingReason =
    bracing === 'diagonal'
      ? highWind
        ? `required (${windSpeed} mph ≥ 140)`
        : certified
          ? 'required (certified)'
          : 'selected'
      : bracingRecommended
        ? 'off — recommended'
        : 'not required'

  // ---- Roof panels ---------------------------------------------------------
  let roofPanelCount = 0
  let roofPanelLengthLabel = ''
  if (roofStyle === 'vertical') {
    roofPanelCount = round(length / cov) * 2
    roofPanelLengthLabel = ftIn(width / 2 + verticalOverhang)
  } else {
    roofPanelCount = round(width / cov) + roofPanelBonus
    roofPanelLengthLabel = `${length}'`
  }
  if (roofPanelCount > 0) {
    lines.push({
      category: 'Roof', item: 'Roof panels', qty: roofPanelCount, unit: 'panels',
      detail: `${roofPanelLengthLabel} long · ${roofColor}`, sku: 'PANEL-29GA',
    })
  }
  if (hasRidge && length > 0) {
    const capLen = rules.ridgeCapPieceLength > 0 ? rules.ridgeCapPieceLength : 11
    lines.push({
      category: 'Roof', item: 'Ridge cap', qty: Math.ceil(length / capLen), unit: 'pieces',
      detail: trimColor, sku: 'RIDGE-CAP',
    })
  }

  // ---- Wall panels ---------------------------------------------------------
  if (encloseSides && length > 0) {
    const perSide = wallOrientation === 'horizontal' ? Math.ceil(legHeight / cov) : round(length / cov)
    const detail = wallOrientation === 'horizontal' ? `${length}' long` : `${ftIn(legHeight)} long`
    lines.push({
      category: 'Walls', item: 'Side wall panels', qty: perSide * 2, unit: 'panels',
      detail: `${detail} · ${wallColor} (both sides)`, sku: 'PANEL-29GA',
    })
  }
  if (encloseEnds && width > 0) {
    const perEnd = round(width / cov) + roofPanelBonus
    const heightLabel = hasRidge ? `up to ${ftIn(peakHeight)} (gable-cut)` : ftIn(peakHeight)
    lines.push({
      category: 'Walls', item: 'End wall panels', qty: perEnd * 2, unit: 'panels',
      detail: `${heightLabel} · ${wallColor} (both ends)`, sku: 'PANEL-29GA',
    })
  }
  const totalPanels = lines.filter((l) => l.item.endsWith('panels')).reduce((s, l) => s + l.qty, 0)

  // ---- Structure (frame + secondary steel) --------------------------------
  const closedSides = encloseSides ? 2 : 0
  const closedEnds = encloseEnds ? 2 : 0
  const epSpacing = endPostSpacingFt(windSpeed, legHeight)
  const endPostsPerEnd = Math.max(0, Math.ceil(width / epSpacing) - 1)
  const endPosts = closedEnds * endPostsPerEnd
  const columns = frames * 2 // side-wall legs
  const posts = columns + endPosts

  if (frames > 0) {
    const chartNote = frameChart
      ? `Table ${frameChart}′ · ${groundSnow}psf/${windSpeed}mph · max ${ftIn(maxFrameSpacingFt)} o.c.`
      : `est. max ${ftIn(maxFrameSpacingFt)} o.c.`
    const extraNote = extraTrusses > 0 ? ` · +${extraTrusses} extra (justified)` : ''
    lines.push({
      category: 'Structure', item: 'Trusses / bows (frames)', qty: frames, unit: 'each',
      detail: `${width}' wide · ${ftIn(actualSpacingFt)} o.c.${extraNote} · ${chartNote}`,
    })
    lines.push({
      category: 'Structure', item: 'Column posts (legs)', qty: columns, unit: 'each',
      detail: `${ftIn(legHeight)} · 2½" tube (both sides)`, sku: 'TUBE-MAIN',
    })
    lines.push({
      category: 'Structure', item: 'Roof beams / rafters', qty: frames * roofBeamsPerFrame, unit: 'each',
      detail: `${ftIn(slopeLen)} · 2½" tube`, sku: 'TUBE-MAIN',
    })
    if (hasRidge) {
      lines.push({
        category: 'Structure', item: 'Peak braces', qty: frames, unit: 'each',
        detail: '2½" 14ga channel', sku: 'CHANNEL-PEAK',
      })
    }
    const kbLen = legHeight <= 8 ? 24 : 36
    lines.push({
      category: 'Structure', item: 'Knee braces', qty: frames * 2, unit: 'each',
      detail: `${kbLen}" · 2½×1½ channel`, sku: 'CHANNEL-KNEE',
    })
    // Base rail along every wall line the posts seat into.
    const baseRailFt = round(2 * (width + length))
    lines.push({
      category: 'Structure', item: 'Base rail', qty: baseRailFt, unit: 'ft',
      detail: 'perimeter · 2½" tube', sku: 'TUBE-MAIN',
    })
    // Connector sleeves — one per post base (+ eave splices).
    lines.push({
      category: 'Structure', item: 'Connector sleeves', qty: posts, unit: 'each',
      detail: '6" · 2¼" 12ga tube', sku: 'SLEEVE',
    })
  }
  if (endPosts > 0) {
    lines.push({
      category: 'Structure', item: 'End-wall posts', qty: endPosts, unit: 'each',
      detail: `${endPostsPerEnd}/end @ ${epSpacing}' o.c. · 2½" tube`, sku: 'TUBE-MAIN',
    })
  }
  // Diagonal sway braces — Math.max(2, closedSides·2) per the plan brace details.
  const braceQty = bracing === 'diagonal' && frames > 0 ? Math.max(2, closedSides * 2) : 0
  if (braceQty > 0) {
    lines.push({
      category: 'Structure', item: 'Diagonal sway braces', qty: braceQty, unit: 'each',
      detail: `2" sq 14ga tube + gussets · ${bracingReason}`,
    })
  }

  // Purlins (roof) + girts (walls) — counts from spacing.
  const purlinSpacing = rules.purlinSpacingFt > 0 ? rules.purlinSpacingFt : 2.5
  const girtSpacing = rules.girtSpacingFt > 0 ? rules.girtSpacingFt : 3.5
  const purlinRunsPerSlope = frames > 0 ? Math.ceil(slopeLen / purlinSpacing) + 1 : 0
  const purlinRuns = purlinRunsPerSlope * (hasRidge ? 2 : 1)
  if (purlinRuns > 0) {
    lines.push({
      category: 'Structure', item: 'Purlins (hat channel)', qty: purlinRuns, unit: 'runs',
      detail: `${ftIn(purlinSpacing)} o.c. · 4×1 hat · run = ${length}'`, sku: 'HAT-CHANNEL',
    })
  }
  const girtRunsPerWall = Math.ceil(legHeight / girtSpacing)
  const girtWalls = closedSides + closedEnds
  const girtRuns = girtWalls * girtRunsPerWall
  if (girtRuns > 0) {
    lines.push({
      category: 'Structure', item: 'Girts (hat channel)', qty: girtRuns, unit: 'runs',
      detail: `${ftIn(girtSpacing)} o.c. · ${girtWalls} closed walls`, sku: 'HAT-CHANNEL',
    })
  }

  // ---- Trim ----------------------------------------------------------------
  const trimLen = rules.trimPieceLength > 0 ? rules.trimPieceLength : 11
  if (length > 0) {
    lines.push({
      category: 'Trim', item: 'Eave trim', qty: Math.ceil(length / trimLen) * 2, unit: 'pieces',
      detail: `both eaves · ${trimColor}`, sku: 'TRIM-BOX-EVE',
    })
  }
  if (width > 0) {
    const rakeRuns = hasRidge ? 4 : 2
    lines.push({
      category: 'Trim', item: 'Rake / gable trim', qty: Math.ceil(slopeLen / trimLen) * rakeRuns, unit: 'pieces',
      detail: trimColor, sku: 'TRIM-L',
    })
  }
  if (encloseSides && encloseEnds && legHeight > 0) {
    lines.push({
      category: 'Trim', item: 'Corner trim', qty: 4 * Math.ceil(legHeight / trimLen), unit: 'pieces',
      detail: `${ftIn(legHeight)} · ${trimColor}`, sku: 'TRIM-CORNER',
    })
  }

  // ---- Fasteners -----------------------------------------------------------
  // 1) Sheathing screws.
  if (totalPanels > 0) {
    const screws = totalPanels * rules.screwsPerPanel
    lines.push({
      category: 'Fasteners', item: 'Panel (sheathing) screws',
      qty: Math.ceil(screws / Math.max(1, rules.screwsPerBox)), unit: 'boxes',
      detail: `~${screws} screws (${rules.screwsPerPanel}/panel)`,
    })
  }
  // 2) Structural (frame-to-frame) screws — per-connection counts.
  const sleeveScrews = windSpeed <= 125 ? 4 : windSpeed <= 155 ? 6 : 8
  const purlinScrews = purlinRuns * frames * rules.screwsPurlinToBeam
  const girtScrews = girtRuns * frames * rules.screwsGirtToPost
  const eaveScrews = frames * 2 * rules.screwsEaveHatChannel
  const sleeveTotal = posts * sleeveScrews
  const bracketScrews = frames * 2 * rules.screwsPerBracket // knee-brace clips (approx)
  const braceScrews = braceQty * 2 * rules.screwsPerBracket // gusset plate at each brace end
  const structuralScrews = purlinScrews + girtScrews + eaveScrews + sleeveTotal + bracketScrews + braceScrews
  if (structuralScrews > 0) {
    lines.push({
      category: 'Fasteners', item: 'Structural screws (#12 SDS)',
      qty: Math.ceil(structuralScrews / Math.max(1, rules.screwsPerBox)), unit: 'boxes',
      detail: `~${structuralScrews}: purlin ${rules.screwsPurlinToBeam}/ea, girt ${rules.screwsGirtToPost}/ea, eave ${rules.screwsEaveHatChannel}, sleeve ${sleeveScrews}/ea (${windSpeed}mph)`,
    })
  }
  const enclosedWalls = closedSides + closedEnds
  if (enclosedWalls > 0) {
    lines.push({
      category: 'Fasteners', item: 'Closures', qty: enclosedWalls * rules.closuresPerWall, unit: 'each',
      detail: `${rules.closuresPerWall}/wall`,
    })
  }
  if (roofStyle === 'vertical' && roofPanelCount > 0) {
    lines.push({
      category: 'Fasteners', item: 'Side vertical trim (SVT)', qty: round(roofPanelCount / 2) + 1, unit: 'pieces',
      detail: trimColor, sku: 'TRIM-SIDE-VERT',
    })
  }
  // 3) Anchors (Table 11) — per post, by wind; +2 at each enclosed corner.
  if (posts > 0) {
    const perPost = windSpeed <= 135 ? 1 : 2
    const cornerExtra = enclosed ? 4 : 0
    const openingAnchors = 2 * (walkDoors + windows + rollUps.length)
    const anchors = posts * perPost + cornerExtra + openingAnchors
    lines.push({
      category: 'Fasteners', item: 'Anchors', qty: anchors, unit: 'each',
      detail: `½"Ø×7" · ${perPost}/post (${windSpeed}mph)${enclosed ? ' + 2/corner' : ''} + 2/opening`,
      sku: 'ANCHOR-WEDGE',
    })
  }

  // ---- Openings ------------------------------------------------------------
  if (walkDoors > 0) {
    lines.push({ category: 'Openings', item: 'Walk-in door posts', qty: walkDoors * 2, unit: 'each', detail: '2½" tube jambs', sku: 'TUBE-MAIN' })
    lines.push({ category: 'Openings', item: 'Walk-in door brackets', qty: walkDoors * rules.doorBrackets, unit: 'each' })
    lines.push({ category: 'Openings', item: 'Walk-in door J-trim', qty: walkDoors * rules.doorJTrim, unit: 'pieces', sku: 'TRIM-J' })
    lines.push({ category: 'Openings', item: 'Walk-in door tubing', qty: walkDoors * rules.doorTubingFt, unit: 'ft' })
  }
  if (windows > 0) {
    lines.push({ category: 'Openings', item: 'Window trim', qty: windows * rules.windowTrim, unit: 'pieces', sku: 'TRIM-J' })
    lines.push({ category: 'Openings', item: 'Window tubing', qty: windows * rules.windowTubingFt, unit: 'ft' })
    lines.push({ category: 'Openings', item: 'Window brackets', qty: windows * rules.windowBrackets, unit: 'each' })
  }
  if (rollUps.length > 0) {
    // Each roll-up: 2 door posts + a header sized to the opening width.
    lines.push({
      category: 'Openings', item: 'Roll-up door posts', qty: rollUps.length * 2, unit: 'each',
      detail: '2½" tube jambs', sku: 'TUBE-MAIN',
    })
    const headerNote = rollUps.map((d) => `${d.width}×${d.height}→${headerClass(d.width, rules)}`).join(', ')
    lines.push({
      category: 'Openings', item: 'Roll-up door headers', qty: rollUps.length, unit: 'each',
      detail: headerNote,
    })
    const perimeterTrim = rollUps.reduce((s, d) => s + Math.ceil((2 * (d.width + d.height)) / trimLen), 0)
    lines.push({
      category: 'Openings', item: 'Roll-up door trim', qty: perimeterTrim, unit: 'pieces',
      detail: rollUps.map((d) => `${d.width}x${d.height}`).join(', '), sku: 'TRIM-J',
    })
    lines.push({ category: 'Openings', item: 'Roll-up door tubing', qty: rollUps.length * rules.rollUpTubingFt, unit: 'ft' })
  }

  if (roofStyle === 'vertical' && pitch <= 0) {
    warnings.push('A vertical roof needs a pitch — set one to size the panels and peak height.')
  }
  if (enclosed && length > 50) {
    warnings.push('Enclosed buildings over 50′ long need a double frame at mid-length (per the plans).')
  }

  return {
    lines,
    meta: {
      peakHeight,
      peakHeightLabel: ftIn(peakHeight),
      roofPanelCount,
      roofPanelLengthLabel,
      bays,
      trusses: frames,
      baseTrusses: baseFrames,
      extraTrusses,
      totalPanels,
      frameSpacingFt: actualSpacingFt,
      frameSpacingMaxFt: maxFrameSpacingFt,
      frameChart,
      loadAllowed,
      structuralScrews,
      certified,
      purlinSpacingFt: purlinSpacing,
      girtSpacingFt: girtSpacing,
      bracing,
      bracingRecommended,
      bracingReason,
    },
    warnings,
  }
}
