-- ============================================================
-- Migration 059: Canonical finish-price resolver
-- ============================================================
-- One authoritative place for "what is the per-item price of this product, for
-- this tier, in this finish class". Both price paths (storefront checkout and
-- the staff OrderBuilder) should resolve through this so they can't diverge.
--
-- Resolution order (see migration 057):
--   1. product_finish_prices(product_id, tier_key, finish_class)  -- finish-specific
--   2. product_tier_prices(product_id, tier_key)                  -- base/solid tier price
--   3. products.price                                             -- base fallback
--
-- p_tier_key must be a BASE tier (retail / contractor). Derived tiers
-- (retail_tax_exempt, contractor_tax_exempt_tbd, ag_tax_exempt, …) price off
-- their basis tier — resolve that app-side first (priceBasisTier in
-- src/lib/pricing-tiers.ts) and pass the basis key here.
--
-- p_finish_class is 'galvalume' | 'solid' | 'pattern', or NULL for a line with
-- no finish (colorless product) — NULL simply falls through to the base price.
--
-- SECURITY INVOKER (default): the pricing tables are staff-only under RLS, so
-- this returns real prices for staff and the products.price fallback otherwise.
-- This is a PER-ITEM price. Panels are sold by the linear foot, so the caller
-- still multiplies by the piece length; this function does not know footage.
CREATE OR REPLACE FUNCTION public.finish_class_price(
  p_product_id   int,
  p_tier_key     text,
  p_finish_class text
)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (SELECT pfp.price FROM public.product_finish_prices pfp
      WHERE pfp.product_id = p_product_id
        AND pfp.tier_key   = p_tier_key
        AND pfp.finish_class = p_finish_class),
    (SELECT ptp.price FROM public.product_tier_prices ptp
      WHERE ptp.product_id = p_product_id
        AND ptp.tier_key   = p_tier_key),
    (SELECT p.price FROM public.products p WHERE p.id = p_product_id)
  );
$$;

GRANT EXECUTE ON FUNCTION public.finish_class_price(int, text, text) TO authenticated;

-- ── Optional (NOT enabled): server-side price backstop ───────────────────────
-- Regular panel lines are currently priced client-side and trusted (only
-- overstock lines are server-priced, via price_overstock_order_item in migration
-- 034). If you later want the DB to be authoritative, add a BEFORE INSERT trigger
-- on order_items that, when unit_price IS NULL/0 and panel_overstock_id IS NULL,
-- fills unit_price from finish_class_price(...) — reading the order's customer
-- tier via orders → profiles, mapping it to its basis tier, deriving finish_class
-- from finish_id → finishes, and (for per-foot products) multiplying by
-- length_feet. It is intentionally left out here: it duplicates the tier-basis
-- mapping that lives in app code and changes today's trusted-client behavior, so
-- it should be added deliberately with its own tests rather than bundled in.
