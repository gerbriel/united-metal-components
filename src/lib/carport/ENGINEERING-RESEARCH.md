# Carport / Metal-Building Engineering Research

Source material: the stamped structural plans in `/Engineering` (NOT committed).
All are **Quality Metal Carports, LLC** buildings, sealed by the licensed **engineer(s)
of record** (PEs in CA / UT / AZ / NV). This is the real
engineering behind the products the "Material Cheat Sheet" was hand-approximating.

Purpose of this doc: capture *what member goes where, how many, and how long* so we can
replace the calculator's best-guess constants (`rules.ts`) with the actual engineering
logic, and add the ~15 structural members the calculator does not yet count.

Two kinds of files:

| Kind | Files | What they give us |
|---|---|---|
| **Generic width templates** | `12/18/20/22/24/30.pdf` | The parametric rules: master member list + load-driven spacing schedules. Same template at 6 widths. |
| **Real permitted jobs** | Andy DeLemos, Cathey's Valley, Klassen, Holly Smith (2493), Shyanne Gubler (90x50 truss) | Calibration: actual dimensions → actual frame/post/purlin counts. |

---

## 1. Master member list (Generic Table 2.1 "Member Properties")

Identical across the 12'–24' templates; 30' upgrades a few (see §4). The last column in
the PDF is **"DETAIL NO."** (which cross-section drawing to look at) — **NOT a quantity**.
Quantities come from the framing layout + spacing schedules in §2.

| # | Member | Material (light carport tier) | Where it goes | How many | Length |
|---|---|---|---|---|---|
| 1 | **Column post** | 2½"×2½"×14ga tube | Each end of every frame, both side walls | `2 × frameCount` | leg height (≥8' gets a 2¼×2¼×12ga insert) |
| 2 | **Roof beam** (rafter) | 2½"×2½"×14ga tube | 2 per frame (one per slope) | `2 × frameCount` | ≈ half-width ÷ cos(pitch) + overhang (30' plan labels it 16') |
| 3 | **Base rail** | 2½"×2½"×14ga tube | Runs along the base of all sheeted walls | perimeter length | building perimeter, in stick lengths |
| 4 | **Peak brace** | 2½"×2½" 14ga **channel** (30': tube) | At ridge of every frame | `frameCount` | short |
| 5 | **Knee brace** | 2½"×1½" 14ga channel | 2 per frame (each eave) | `2 × frameCount` | Table 3.1: ≤8' eave→24", 9–12'→36" |
| 6 | **Connector sleeve** | 2¼"×2¼"×12ga tube | Splices tube runs (roof beam, tall columns) | per splice (6"/8"/12" pieces) | 6–12" |
| 7 | **Base angle** | 2"×2"×3"lg 3/16" angle | Anchor clips along base rail | ~1 per anchor | 3" |
| 8 | **Purlin** | 4"×1" 14ga/18ga **hat channel** | Roof, spanning across frames | see Table 5.1 | building length (in sticks) |
| 9 | **Girt** | 4"×1" 14ga/18ga hat channel | Sheeted walls, horizontal | see Table 5.2 | wall length (in sticks) |
| 9A | **Opt. end-wall girt** | 2½"×1½" 14ga channel | End walls | optional | — |
| 10 | **Sheathing** | 29ga corrugated, **36" net coverage** | Roof + walls | area ÷ coverage | 3'-wide panels (matches `panelCoverage: 3`) |
| 11 | **End-wall post** | 2½"×2½"×14ga tube | Vertical posts in each end wall | Table 8-A.1 | up to eave, +gable triangle |
| 12 | **Door post** | 2½"×2½"×14ga tube | 2 per framed opening (roll-up / walk) | `2 × openings` | opening height |
| 13 | **Single header** | 2½"×2½"×14ga tube | Over openings (shorter/lighter) | 1 per opening | opening width |
| 14 | **Double header** | dbl 2½"×2½"×14ga tube | Over wider/loaded openings | 1 per opening | opening width |
| 15 | **Service door / window framing** | 2½"×2½"×14ga tube | Around each walk door / window | 1 set per opening | perimeter |
| 16 | **Angle bracket** | 2"×2"×2"lg 14ga angle | Post-to-header / clip connections | many (per connection) | 2" |
| 17 | **Straight bracket** | 2"×2"×4"lg 14ga plate | Flat clips at door posts / base | many | 4" |
| 18 | **PB support** | 2½"×2½"×14ga tube | Peak support (wider spans, 30'+) | `frameCount` on wide | short |
| 19 | **Diagonal brace** | 2"×2"×14ga tube | Corner/wall bracing (wind ≥140 mph or partial enclosure) | per braced bay | diagonal |
| 20 | **Gable brace** | 2"×2"×14ga tube | End-wall gable | per gable | — |
| 21 | **DB bracket** | 2¼"×2¼"×6"lg 14ga angle | Diagonal-brace connections | per diagonal brace | 6" |
| 22 | **Truss spacer** | 2½"×2½"×14ga tube | Between doubled frames | as needed | — |
| 23 | **All fasteners** | #12×1" self-drill screws, neoprene/steel washer (ESR-2196) | Everywhere | see §3 | — |

**Sheathing fastener schedule (Table 2.2):** corner panels 9" c/c · side laps min 1 · edge
laps 4½" c/c · elsewhere 9" c/c. Gauges (Table 2.3): 29ga=.0135" · 18ga=.049" · 14ga=.083"
· 12ga=.109".

---

## 2. The real sizing engine (load-driven, NOT fixed)

This is the biggest gap vs the current calculator. Counts are driven by **spacing
schedules** keyed on: eave height, ground-snow/roof-live load (PSF), wind speed (MPH), and
enclosure type. The cheat-sheet's fixed 5' truss / 3' purlin assumptions are just one cell
of these tables.

### Table 4 — Frame (truss/bent) spacing → drives frame count
Units = inches. Split by Enclosed vs Open, then by eave-height band (≤6' / 7–9' / 10–12'),
load, and wind. Two values like `54/60` mean the higher is allowed **only for vertical
roof sheathing**. `frameCount = floor(length / spacing) + 1`.

Representative rows (12' template, enclosed, eave 10–12'):

| Snow/Live (PSF) | 105 | 115 | 130 | 140 | 155 | 165 | 180 mph |
|---|---|---|---|---|---|---|---|
| 30/20 | 60 | 60 | 54/60 | 54 | 42 | 42 | 36 |
| 50/34 | 40/54 | 40/54 | 40/54 | 40/54 | 40/42 | 40/42 | 36 |
| 90/61 | 30/36 | 30/36 | 30/36 | 30/36 | 30/36 | 30 | 30 |

→ Low load / low wind = 60" spacing; high load / high wind tightens to 30".

### Table 5.1 — Purlin spacing → purlins per roof slope
Keyed on **frame spacing band** (5'-0"/4'-6"/4'-0"/3'-6"/≤3'-0"), load, wind, and 14ga vs
18ga. Range 12"–54". `purlinRunsPerSlope = ceil(slopeLength / purlinSpacing) + 1`;
total purlin **runs** = that × 2 slopes, each run = building length in sticks.

### Table 5.2 — Girt spacing → girts per wall
Keyed on frame spacing + wind. Range 12"–60". `girtRunsPerWall = ceil(wallHeight / girtSpacing)`.

| Frame spacing | 105 | 115 | 130 | 140 | 155 | 165 | 180 |
|---|---|---|---|---|---|---|---|
| 5'-0" | 60 | 48 | 36 | 30 | 24 | 24 | 18 |
| 4'-0" | 60 | 60 | 54 | 54 | 42 | 36 | 30 |
| 2'-3'  | 60 | 60 | 54 | 54 | 48 | 42 | 42 |

### Table 8-A.1 — End-wall post spacing → end-wall posts
`endWallPosts = ceil(width / spacing) - 1` interior posts per end wall (corners are columns).

| Wind mph | ≤7' eave | 8–9' | 10–12' |
|---|---|---|---|
| 105 | 5' | 5' | 5' |
| 130 | 4.5' | 4.5' | 4' |
| 140 | 4.5' | 4.5' | 3' |
| 155 | 4' | 4' | 2.5' |
| 165–180 | 3.5' | 3' | 2' |

### Table 3.2 — Fasteners per structural connection (wind-driven)
105–125 mph → 4 · 130–155 → 6 · 160–180 → 8 screws per sleeve/clip connection. (This is
*structural* fastener count, separate from the sheathing screws the calculator already does.)

---

## 3. Fastener schedule (complete)

There are **two separate screw populations**: sheathing screws (skin → framing) and
structural screws (framing → framing). Both use #12/#12-14 self-drill screws w/
neoprene/steel washer (ESR-2196), but they're counted differently.

### 3A. Sheathing screws — per panel, BY LOCATION (roof vs walls)
Panels are **36" (3') wide with a 6" side-lap**. Screws land wherever the panel crosses a
**purlin** (roof) or **girt** (wall), at the Table 2.2 spacings:

| Where on the panel | Spacing | Screws across a 36" row | Pattern name |
|---|---|---|---|
| Field ("elsewhere") | 9" c/c | ~4–5 | `36/4` |
| Edge laps / end laps | 4½" c/c | ~8 | `36/8` |
| Corner panels | 9" c/c | ~4–5 | `36/4` |
| Side laps (panel-to-panel) | min **1** stitch screw | — | — |

**Per-panel formula (this is the real driver, not a flat 40):**
- **ROOF panel:** `screws = (purlin rows it crosses) × (screws per row)`
  → interior panels use the 4–5 row; perimeter/edge/eave/ridge panels use the 8 row.
  Purlin rows come from **Table 5.1**.
- **SIDE-WALL / END-WALL panel:** `screws = (girt rows it crosses) × (screws per row)`
  → girt rows from **Table 5.2**; corners & top/bottom edges use the 8 row.
- **Plus** 1 stitch screw per side-lap between adjacent panels.
- So a tall wall (more girts) or a long roof slope (more purlins) = more screws per panel.
  The cheat-sheet's flat `screwsPerPanel: 40` is a blended average — replace with
  `rows × perRow` once purlin/girt counts are computed.

### 3B. Structural screws (#12-14 × ¾" SDS) — per connection
| Connection | Screws |
|---|---|
| **Purlin → roof beam** (each crossing) | **2** |
| **Girt → post** (each crossing) | **2** |
| **Eave hat-channel** (2, face-to-face) | **6 per hat channel** |
| Eave C-channel (4-sides-enclosed only) | 4 per C-channel |
| 6" connector sleeve | 4 / 6 / 8 — Table 3.2 by wind (105–125 / 130–155 / 160–180 mph) |
| 8" connector sleeve | 4 / 6 / 8 |
| 12" connector / column sleeve (heavier bldgs) | 8 |
| Truss purlin splice (12" sleeve) | 12 |

### 3C. Bracket / clip connections — **4 fasteners each** (E.S. = each side)
Every angle bracket [16], straight/flat bracket [17], and angle clip [15] = **4 screws**.
Locations (from end-/side-wall framing detail sheets 7 & 8-B):
- Door post ↔ base rail: angle bracket [16] (4) **+** straight/flat bracket [17] (4)
- Door / header ↔ post (top): angle clip [15] (4)
- Header ↔ column / end-wall post (each end): angle clip [15] (4)
- End-wall post ↔ base rail: angle bracket [16] (4)
- End-wall post ↔ roof beam: straight bracket [17] (4) + angle clip [15] (4)
- Gable header ↔ corner post: angle clip [15] (4)

### 3D. Brace (diagonal / corner) bracket connections
| Bracket | Screws |
|---|---|
| DB bracket [21] (2¼×2¼×6" angle) → post + diagonal braces | **7** |
| 6"×6"×14ga plate bracket → post + diagonal braces | 6 |
| 7"×7"×14ga plate bracket → post + diagonal braces | 14 |

### 3E. Brackets PER DOOR / opening
- **Service door / window:** framed with **4 angle clips** (one per corner), 4 screws each
  = **16 structural screws**. (Validates current `doorBrackets: 4`.)
- **Roll-up / overhead door** (2 door posts + single or double header): each post base =
  angle bracket [16] + straight bracket [17]; each post top / header end = angle clip [15].
  ≈ **6 brackets per roll-up** (2 base-angle + 2 base-flat + 2 head clips), 4 screws each.
- Min 1 anchor each side of every opening (Table 11).

### 3F. Anchors (base, wind-driven — Table 11)
- 1 anchor next to every post; **2 at enclosed-building corners**; 1 each side of openings.
- 105–135 mph → (1) ½"Ø×7"; 136–180 → (2) ½"Ø×7". Heavier truss jobs use ¾"Ø strong-bolts.
- Real jobs: **4 anchors/side-wall post** (Andy DeLemos) up to **6** (Cathey's Valley).

### 3G. Trim / flashing — **all trim sticks are 11'-0" long**
Ridge cap, eave/rake trim, corner trim, J-/L-trim: **11' pieces**. (Update
`trimPieceLength` and `ridgeCapPieceLength` from the 10.5 guess to **11**.)

---

## 4. Product tiers (member sizes & spacing change by tier)

The plans are NOT one product — they're three structural tiers. The calculator should
pick defaults by tier (or expose tier as an input):

| Tier | Widths seen | Frame type | Purlin/girt | Posts | Frame spacing |
|---|---|---|---|---|---|
| **A – Light carport** | 12–24' | Single A-frame / bent-bow (col+rafter+peak+knee) | 4×1 hat channel | single | 2.5'–5' (Table 4) |
| **B – Reinforced** | ~30' + | Same bent, **column gets 12ga insert**, peak brace→tube, **PB support added** | hat channel | single | 2.5'–5' |
| **C – Truss building** | 40–91' | Real **truss**: top+bottom chord + webs | 2½" sq **tube** | **doubled "spacer" posts** (6" spacer @ 18" c/c), corner posts | **8'–10'** |

Tier C examples all use square-tube purlins/girts and doubled posts, and many add a
**lean-to** (its own row of frames + roof members + purlins).

---

## 5. Real worked examples (calibration data)

| Job | Size (W×L×leg) | Pitch | Load / wind | Frames | Frame spacing | Notes |
|---|---|---|---|---|---|---|
| **Andy DeLemos** 448-24-0360 | 40×50×16' | 3:12 | Pg0, Lr20, 110mph | ~6 | ~10' o.c. | Enclosed garage, roll-ups on end wall; 4 anchors/side post; peak 22'-9" |
| **Holly Smith** 448-24-2493 | 40×60×15' | 3:12 | Pg30, 120mph | (60' len) | — | Reno NV snow case |
| **Klassen** 448-24-0440 | 60×52 | — | — | 7 main + 6 lean-to | 8'–8'7" | Has lean-to addition |
| **Cathey's Valley** 448-23-3237 | ~80×54 | — | — | ~10 | ~8' | 6 anchors/side post; 3/4"Ø strong-bolts |
| **Shyanne Gubler** (90x50 file) | 51×91×10' | 3:12 | Pg28, 100mph | many | — | Full truss + lean-to; 12" purlin splice sleeves |

Key calibration takeaways:
- Frame spacing on real jobs (8–10') is **much wider** than the cheat-sheet's 5' because
  these are truss buildings — reinforces that `trussSpacing` must be tier/load aware, not a
  constant.
- Column layout plans show `frames = spaces + 1` with end frames flush to end walls.
- Anchors/post scale with wind/enclosure (4 → 6 per post); corners get the most.

---

## 6. Gap analysis → concrete calculator changes

Mapped to `src/lib/carport/{rules,types,calc}.ts`.

### 6a. Members the BOM does **not** yet produce (should add to Structure/Trim)
peak braces, knee braces, base rail, base angle/anchor clips, connector sleeves, end-wall
posts, door posts, headers (single/double), angle + straight + DB brackets, diagonal &
gable braces, PB support, purlins (as hat channel vs the current generic "hat channel"),
structural screws. Each already exists as a real SKU family (tube/channel/clip) so they can
be SKU-tagged like the panels.

### 6b. Inputs to add to `CarportInput`
- `groundSnowLoad` / `roofLiveLoad` (PSF) and `windSpeed` (MPH) — these *drive every
  spacing table*. Without them the counts are guesses.
- `eaveHeight` band (or derive from `legHeight`).
- `enclosureType`: `open | 3-sided | partial | enclosed` (today only booleans
  `encloseSides/encloseEnds`). Table 4 + bracing rules key off this.
- `tier`: `light | reinforced | truss` (or auto-pick from width: ≤24 light, ~30 reinforced,
  ≥40 truss) to select member sizes.
- `leanTo` (bool + size) — Klassen/Gubler show this is common.

### 6c. Rules to replace with schedule lookups (keep editable as override)
- `trussSpacing: 5` → `frameSpacing = lookup(Table 4, eave, load, wind, enclosure)`; frames
  `= floor(length/spacing)+1`.
- **New** purlin count = Table 5.1 lookup (currently purlins aren't derived from geometry).
- **New** girt count = Table 5.2 lookup.
- **New** end-wall posts = Table 8-A.1 lookup.
- **New** knee-brace length = Table 3.1 (24"/36").
- **New** structural-fastener multiplier = Table 3.2 (4/6/8 by wind).
- Confirm sheathing: 29ga, **36" net coverage** (validates `panelCoverage: 3`).
- Replace flat `screwsPerPanel: 40` with `rows × screwsPerRow` per §3A (roof uses purlin
  rows, walls use girt rows; perimeter panels = 8/row, field = 4–5/row).
- Add a **structural screw** tally (§3B–3E): purlin/girt 2 ea, hat-channel 6, sleeves
  4/6/8, every bracket/clip 4, brace brackets 6/7/14.
- Trim sticks are **11'** (done: `trimPieceLength`/`ridgeCapPieceLength` set to 11).

### 6d. Openings (validate current constants against plans)
Plans confirm each framed opening = 2 door posts + 1 header (single or double) + service
framing + angle clips, with rules: side-wall O.H. door height ≤ eave−2'; can't cut >2
frames; min 1 clear bay between doors and from corners; min 12" between openings on end
walls. The calculator should *warn* when an opening violates these (it already has a
`warnings[]` channel in `BomResult`).

### 6e. Bracing logic (new)
Diagonal corner bracing required when wind ≥140 mph, and side-wall bracing when an adjacent
end wall is partially enclosed (Sheet 9 notes). Drives members 19/20/21 counts.

---

## 7. Suggested phased implementation
1. **Phase 1 (no new inputs):** add the missing *deterministic* members to the BOM —
   base rail, base angle, peak/knee braces, end-wall posts (via a simple width rule),
   door posts/headers per opening, brackets. Big accuracy win, low risk.
2. **Phase 2:** add `windSpeed` + load + `enclosureType` inputs and wire the four spacing
   schedules (Tables 4, 5.1, 5.2, 8-A.1) as lookup functions with the editable value as an
   override. This makes frame/purlin/girt/post counts match engineering.
3. **Phase 3:** tiers (member sizes + truss vs bent), lean-to, and opening/bracing warnings.

Schedules to transcribe fully from the PDFs when building Phase 2: Table 4, 5.1, 5.2 (per
width file — they differ slightly by width), 8-A.1, 3.1, 3.2, 2.2. The 12' file is fully
decoded in this session; the other widths share structure with different cell values.

---

## 8. UPDATE — full-corpus extraction (222 files) & master spec

A later pass extracted the **complete parametric tables and 12 built-size member schedules**
across the full plan library. The authoritative synthesis now lives in the **Carports repo**
(the active engineering codebase, gitignored):
`../Carports/engineering/ENGINEERING-SPEC.md` + appendices A–D (raw Table 4/5/8 for all widths,
member schedules, styles/calc methodology, open-source tooling). Key corrections to the tier
model above:

- **Only Table 4 (frame spacing) is width-dependent.** Table 5.1 (purlin), 5.2 (girt), 8-A.1
  (end post), 3.1/3.2 (knee/fastener), 3-B.1 (peak brace), 11 (anchor) are **identical across
  all widths** — one shared copy each. Encode Table 4 as 6 width charts × 3 eave bands ×
  enclosed/open; honor `---` (reject) and `x/y` (higher only for vertical sheathing).
- **Peak brace ≠ truss threshold.** Real plans use a **peak-brace bent up to 60' wide** (even
  Pg 98 / 135 mph). A **king-post triangulated truss appears only on the explicit TRUSS product**
  (90×50). Revise "Tier C = truss at 40'".
- **Columns:** single **12ga** (smallest) → **14ga**, doubling to **(2) stitch-welded at width
  ≥35'**; **12ga tube insert** when eave >8'. No ladder/zigzag in the tube line.
- **Headers scale with OPENING width, not building size:** `MAX_SPAN=(8·0.6·Fy·S)/W` →
  (2)-tube ≤11', (4)-tube 12–16', 12×3½ C to 20'.
- **Roof diagonal/horizontal bracing** trigger = **snow ≥30 psf and/or wind ≥105 mph**.
- **Screw capacity** (ESR-2196): **625 lbf shear / 775 lbf tension** per #12-14 SDS; base
  sleeve = 4 screws + 1/8"×4" fillet weld. Sheathing = **36/3 or 36/6** pattern per panel.
- **Codes:** ASCE 7-22 (CA) / 7-16 (Nevada set); AISC 360 + AISI S100 + AISC 341 OCBF; ACI 318.
- **Toward plan generation:** Python microservice (Pynite + sectionproperties + pyCUFSM + own
  AISI S100 / ASCE 7) → ezdxf + ReportLab; **PE-in-the-loop** (software drafts, PE stamps).
