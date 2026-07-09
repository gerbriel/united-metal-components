-- Migration 031: Add the 9" square plate product
-- ============================================================================
-- A flat 9" square steel plate — a structural accessory homed in the Components
-- bucket (alongside the hat channel and L-bracket). The storefront renders it
-- via the 'plate' 3D archetype (PLATE-9 → plate in src/components/product3d/
-- resolve.ts): a thin flat slab in the same steel finish color and sheet gauge
-- as the hat channel / brace.
--
-- PLACEHOLDERS (adjust once real values are known):
--   price / price_contractor — seeded at $1.00 / $0.80
--   stock_qty                — seeded at 100 (matches the hat channel) so the
--                              product is live and orderable
--
-- Idempotent: ON CONFLICT (sku) upserts the descriptive fields, but deliberately
-- leaves price and stock_qty untouched on re-run so later manual edits survive.

INSERT INTO public.products (sku, name, category_id, description, unit, price, price_contractor, stock_qty, active) VALUES
  ('PLATE-9', '9" Square Plate',
    (SELECT id FROM public.product_categories WHERE slug = 'components'),
    '9" square steel plate',
    'Each', 1.00, 0.80, 100, true)
ON CONFLICT (sku) DO UPDATE SET
  name        = EXCLUDED.name,
  category_id = EXCLUDED.category_id,
  description = EXCLUDED.description,
  unit        = EXCLUDED.unit,
  active      = true;
