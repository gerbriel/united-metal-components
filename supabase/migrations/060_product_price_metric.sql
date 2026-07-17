-- ============================================================
-- Migration 060: Per-item price metric (per foot vs per piece)
-- ============================================================
-- Some products are priced by the LINEAR FOOT (panels, hat channel, braces — cut
-- to a chosen length) and others by the PIECE (doors, screws, anchors). This was
-- previously inferred from the SKU / whether a length was entered. Make it an
-- explicit, admin-editable attribute so the pricing math is driven by data, not
-- hardcoded SKU checks:
--   per_foot  → line price = per-foot rate × length (ft) × quantity
--   per_piece → line price = price × quantity
-- The rate itself still comes from products.price / product_tier_prices /
-- product_finish_prices; this only controls whether length multiplies it.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS price_metric text NOT NULL DEFAULT 'per_piece'
    CHECK (price_metric IN ('per_foot', 'per_piece'));

-- Backfill the length-priced coil products. PANEL-29GA, HAT-CHANNEL, and BRACE
-- (C-channel) are cut by the foot; the overstock shell (PANEL-29GA-OVERSTOCK) is
-- priced per piece per listing, so it stays per_piece.
UPDATE public.products
  SET price_metric = 'per_foot'
  WHERE sku IN ('PANEL-29GA', 'HAT-CHANNEL', 'BRACE')
     OR lower(coalesce(unit, '')) IN ('foot', 'ft', 'linear foot', 'linear ft', 'per foot');
