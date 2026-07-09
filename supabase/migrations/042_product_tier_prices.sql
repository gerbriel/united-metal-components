-- ── Per-item pricing by tier ─────────────────────────────────
-- Lets admins set a product's price for a specific pricing tier. A product's
-- effective price for a customer is its override for that customer's tier, or
-- the product's base price (products.price) when no override exists.

CREATE TABLE IF NOT EXISTS public.product_tier_prices (
  id          bigserial PRIMARY KEY,
  product_id  int  NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tier_key    text NOT NULL REFERENCES public.pricing_tiers(key) ON UPDATE CASCADE ON DELETE CASCADE,
  price       numeric(10, 2) NOT NULL CHECK (price >= 0),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, tier_key)
);

CREATE INDEX IF NOT EXISTS product_tier_prices_product_idx ON public.product_tier_prices (product_id);
CREATE INDEX IF NOT EXISTS product_tier_prices_tier_idx    ON public.product_tier_prices (tier_key);

ALTER TABLE public.product_tier_prices ENABLE ROW LEVEL SECURITY;

-- Internal pricing — staff read, admins manage. Never exposed to the storefront.
DROP POLICY IF EXISTS "Staff read tier prices" ON public.product_tier_prices;
CREATE POLICY "Staff read tier prices"
  ON public.product_tier_prices FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS "Admins manage tier prices" ON public.product_tier_prices;
CREATE POLICY "Admins manage tier prices"
  ON public.product_tier_prices FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
