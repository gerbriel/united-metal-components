<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Carport engineering = mirror of the Carports repo

The **engineering model** in `src/lib/carport/` shares its structural logic with the sibling
**Carports** repo (the 3D builder), which is the **source of truth**. Keep that model in sync:
- `src/lib/carport/frameSpacing.ts` is **generated** — do NOT hand-edit. Regenerate from the
  Carports repo: `node scripts/gen-frame-spacing.mjs` (writes both repos).
- When changing engineering rules/logic (frame spacing, structural sizing, load rules), mirror
  the change in Carports `client/src/data/` (`structural.js`, `components.js`) so the builder
  and calculator agree.
- Do not add engineering-firm names to any file here.

## The BOM / shopping-list is project-unique — do NOT mirror it

Exception to the above: the **bill of materials / shopping-list output** of this app's calculator
(the material line items in `src/lib/carport/calc.ts` — SKU, color, size, and detail per line) is a
**deliberately simplified version specific to THIS project**, built to map onto this storefront's
catalog. It is NOT shared with the Carports repo:
- Leave the Carports repo's BOM **as is** — do not port these simplifications into it.
- Changes to the shopping-list shape/fields/SKUs here do **not** need a mirror in Carports.
- Only the underlying engineering model (above) mirrors; the BOM presentation layer diverges on purpose.
