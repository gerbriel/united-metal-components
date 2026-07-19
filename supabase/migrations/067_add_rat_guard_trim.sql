-- ============================================================
-- Migration 067: Add the Rat Guard Trim product (Trim section)
-- ============================================================
-- Rat guard (girth 6") — base trim along the bottom of closed walls: wall face
-- 2.75" → bottom flat 1.25" → 45° kick-back flare 1.5" → 0.5" hem. The 3D model
-- and SKU pin already exist (TRIM-RAT-GUARD → trim-rat-guard in
-- src/components/product3d/resolve.ts); this seeds the missing product row so
-- it appears in the storefront Trim section and the dashboard trim manager.
--
-- Per-color availability comes from trim_stock (migration 058) — rows are
-- created by the inventory trim manager as stock is received, so none are
-- seeded here (a fresh color shows 0 available until received).
--
-- PLACEHOLDERS (adjust once real values are known):
--   price / price_contractor — $8.63 / $6.50, matching the other 6"-girth
--                              trims (TRIM-J / TRIM-L, migration 015)
--   stock_qty                — 50, matching the other trim seed rows
--
-- Idempotent: ON CONFLICT (sku) upserts the descriptive fields, but deliberately
-- leaves price and stock_qty untouched on re-run so later manual edits survive.

INSERT INTO public.products (sku, name, category_id, description, unit, price, price_contractor, stock_qty, active) VALUES
  ('TRIM-RAT-GUARD', 'Rat Guard Trim',
    (SELECT id FROM public.product_categories WHERE slug = 'trim'),
    'Rat Guard Trim — base trim for the bottom of closed walls',
    'Each', 8.63, 6.50, 50, true)
ON CONFLICT (sku) DO UPDATE SET
  name        = EXCLUDED.name,
  category_id = EXCLUDED.category_id,
  description = EXCLUDED.description,
  unit        = EXCLUDED.unit,
  active      = true;
