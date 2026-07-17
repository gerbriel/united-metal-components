-- ============================================================
-- Migration 057: Per-finish-class pricing (`product_finish_prices`)
-- ============================================================
-- Panels and trim price by finish class (galvalume / solid / pattern). Rather
-- than add a finish dimension to product_tier_prices (which would force dropping
-- its UNIQUE(product_id, tier_key) and break the app's onConflict upserts), this
-- LAYERS on top with a separate table. Existing pricing is untouched.
--
-- Effective per-item price for (product, tier, chosen finish):
--   1. product_finish_prices(product_id, tier_key, finish_class)   -- this migration
--   2. product_tier_prices(product_id, tier_key)                   -- migration 042 (the "solid"/base price)
--   3. products.price                                              -- base fallback
-- See public.finish_class_price() in migration 059 for the canonical resolver.
--
-- "Absolute price per class": the existing base tier price already IS the solid
-- price (e.g. PANEL-29GA retail $3.10), so staff normally only add a galvalume
-- row (cheaper) and a pattern row (premium). A 'solid' row is allowed for the
-- case where a product's solid price must differ from its generic base price.
-- tier_key references only BASE tiers (retail/contractor) — derived tiers
-- (retail_tax_exempt, …) price off their basis tier, resolved app-side.

CREATE TABLE IF NOT EXISTS public.product_finish_prices (
  id           BIGSERIAL PRIMARY KEY,
  product_id   INT  NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tier_key     TEXT NOT NULL REFERENCES public.pricing_tiers(key) ON UPDATE CASCADE ON DELETE CASCADE,
  finish_class TEXT NOT NULL CHECK (finish_class IN ('galvalume', 'solid', 'pattern')),
  price        NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, tier_key, finish_class)
);

CREATE INDEX IF NOT EXISTS product_finish_prices_product_idx ON public.product_finish_prices (product_id);
CREATE INDEX IF NOT EXISTS product_finish_prices_tier_idx    ON public.product_finish_prices (tier_key);

ALTER TABLE public.product_finish_prices ENABLE ROW LEVEL SECURITY;

-- Internal pricing — staff read, admins manage. Never exposed to the storefront.
-- Mirrors product_tier_prices (migration 042).
DROP POLICY IF EXISTS "Staff read finish prices" ON public.product_finish_prices;
CREATE POLICY "Staff read finish prices"
  ON public.product_finish_prices FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS "Admins manage finish prices" ON public.product_finish_prices;
CREATE POLICY "Admins manage finish prices"
  ON public.product_finish_prices FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
