<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Carport engineering = mirror of the Carports repo

The material calculator (`src/lib/carport/`) shares its engineering model with the sibling
**Carports** repo (the 3D builder), which is the **source of truth**. Keep them in sync:
- `src/lib/carport/frameSpacing.ts` is **generated** — do NOT hand-edit. Regenerate from the
  Carports repo: `node scripts/gen-frame-spacing.mjs` (writes both repos).
- When changing engineering rules/logic, mirror the change in Carports `client/src/data/`
  (`structural.js`, `components.js`) so the builder and calculator agree.
- Do not add engineering-firm names to any file here.
