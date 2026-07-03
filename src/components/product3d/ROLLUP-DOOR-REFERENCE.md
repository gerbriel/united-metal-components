# Roll-up door reference (Janus International)

Spec data pulled from Janus International manuals/spec sheets to drive the
`garage-door` archetype in the 3D product viewer (`models.tsx`). United Metal
Components garage doors are Janus-pattern rolling sheet doors, NOT sectional
track doors — the curtain coils around a spring barrel above the opening.

Sources:
- Janus Series 650 spec sheet (quality-doorsllc.com mirror of Janus PDF, rev 7/12/11)
- Janus Series 650 installation guide (janusintl.com/hubfs, rev 2/23/10)
- Janus Model 2500/2500i product page (janusintl.com/commercial-doors/series-2500)
- Steel Door Depot 650 listing (color lineup, size limits)

## Model 650 (mini-storage / light duty) — our default door

| Component | Spec |
|---|---|
| Curtain | 26 ga ASTM A653 **Grade 80** full-hard galvanized steel, roll-formed corrugation; Super Durable polyester paint (40-yr film / 25-yr no-fade) |
| Sizes | up to 10'0" × 10'0" |
| Guides | roll-formed **18 ga** galvanized, dual polyethylene wear strips; universal mount ~**2" face × 2" leg** (per install-guide jamb details); mounted spaced **curtain width + 1"** back-of-guide to back-of-guide |
| Brackets | 16 ga galvanized plates (12 ga when over 9' wide or 8' tall); snap-on or bolt-on to guides |
| Barrel | full-width galvanized steel barrel fully enclosing drums, springs and **dead axle / torque tube** |
| Springs | oil-tempered helical torsion, ASTM A229, grease-packed |
| Tensioner | ratchet spring tensioner on one axle end; 8 positions, 1/8-turn increments; wound with a 3/8" bar |
| Bottom bar | roll-formed acrylic-coated galvanized cover + full-width **1-1/2" × 1-1/2" 14 ga** galvanized angle; **PVC bulb astragal**; lift handle(s) + stop clips outside, pull rope inside |
| Latch | curtain-mounted mini latch, right side, yellow-zinc (opt. stainless) cover; 2" throw, magnetic slide, takes padlocks to 7/16" shank |
| Head stops | galvanized clips through guide after curtain is lowered |

### Clearances (650)

Headroom (from opening height):

| Opening height | Vertical headroom | Horizontal headroom |
|---|---|---|
| thru 7'4" | 15-1/2" | 17" |
| 7'4" – 8'8" | 16" | 17-1/2" |
| 8'8" – 10'0" | 17" | 18-1/4" |

Sideroom (from edge of opening): guide 2-1/4", outside of bracket leg 3-3/8",
end of axle 3-1/4". Rain lip: 3-1/2" min header lip, 1-1/2" projection.
Vertical headroom ≈ coil OD → an 8×8 door coils to roughly a **16" diameter roll**.

## Model 2500 / 2500i (heavy commercial)

- Curtain 26 ga Grade 80 galvanized, same corrugation; max **18' × 18'** (324 sq ft)
- Guides **12 ga** galvanized, 2-7/8" deep, bolt-on 1/4" head stop, pre-punched for locks
- Drum **12" diameter** 16 ga galvanized; axle 1-5/16" OD 14 ga steel torque tube
- Bottom bar 24 ga acrylic-coated Galvalume cover + **2" × 1-1/2"** galvanized angle, bulb astragal (durometer 75)
- Push-up, hand-chain, or electric operation

## Corrugation

Janus doesn't publish pitch/depth in text specs. Scaled from their drawings and
photos: shallow rounded wave, ≈ **3–3.5" pitch, ≈ 3/4" deep** — soft sine-like
crests, not the trapezoidal rib of an R-panel wall sheet. The 3D model uses
pitch 3.3", depth 0.7".

## Standard colors (31 — Steel Door Depot lineup)

High Gloss White, Cedar Red, Continental Brown, Desert Sand, Desert Tan, Bronze,
LG Forest Green, Light Stone, Sandstone, Satin White, Silhouette Gray,
AG Galvalume, Colony Green, Evergreen, Ferngreen, Polar Blue, Smart Blue,
Royal Blue, Teal, Ultra Marine Blue, Charcoal Gray, Patriot Red, Sierra Sunset,
Sunset Orange, Valentine Red, EXR Wasabi, Apple Lime Cocktail, Dark Teal,
Maroon, Safety Yellow, Coal Black.

## How the 3D model maps these

- Curtain: sine-wave corrugation (pitch 0.275 ft, depth 0.058 ft), colored steel
- Coil: cylinder tangent to the curtain plane, radius ≈ 12" drum + wraps
  (grows slightly with door height), same curtain color
- Axle: **no bracket plates** on United Metal doors — the galvanized dead-axle
  torque tube just protrudes ~3-1/4" from each end of the coil (spec sideroom);
  no visible tensioner
- Guides: galvanized channels each side, 2" face, spaced curtain + 1"
- Bottom bar: galvanized angle + dark PVC astragal + lift handle + stop clips
- Latch: yellow-zinc plate on the right, low on the curtain
