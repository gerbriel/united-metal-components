-- Admin-editable tax rates + agricultural tax.
--
-- Tax was a hardcoded 8.25% waived for the two exempt tiers, duplicated in the
-- recompute_order_totals trigger (the source of truth) and the client previews.
-- This makes the rates admin-configurable and adds the agricultural tier, whose
-- tax is federal + state-ag applied to the retail-based subtotal.

-- ── 1. Settings store (simple numeric key/value) ─────────────
CREATE TABLE IF NOT EXISTS public.app_settings (
  key        text PRIMARY KEY,
  value      numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed the three tax rates. federal / state-ag default to 0 until an admin sets
-- them; the standard sales rate keeps the previous 8.25%.
INSERT INTO public.app_settings (key, value) VALUES
  ('tax_sales_rate',    0.0825),
  ('tax_federal_rate',  0),
  ('tax_state_ag_rate', 0)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Tax rates aren't sensitive — anyone may read them (checkout previews need them);
-- only admins may change them.
DROP POLICY IF EXISTS "Anyone reads app settings" ON public.app_settings;
CREATE POLICY "Anyone reads app settings"
  ON public.app_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins write app settings" ON public.app_settings;
CREATE POLICY "Admins write app settings"
  ON public.app_settings FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── 2. Recompute totals with configurable rates + per-tier mode ──
-- Tax mode by tier (mirrors TIER_PRICING in src/lib/pricing-tiers.ts):
--   retail_tax_exempt / contractor_tax_exempt → exempt (0)
--   ag_tax_exempt                             → federal + state-ag
--   everything else (incl. contractor_tax_exempt_tbd, still pending) → sales
CREATE OR REPLACE FUNCTION public.recompute_order_totals()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  oid     bigint := COALESCE(new.order_id, old.order_id);  -- new is NULL on DELETE
  sub     numeric(10,2);
  t       numeric(10,2);
  v_tier  text;
  r_sales numeric;
  r_fed   numeric;
  r_ag    numeric;
BEGIN
  SELECT COALESCE(SUM(total_price), 0) INTO sub
    FROM public.order_items WHERE order_id = oid;
  SELECT p.pricing_tier INTO v_tier
    FROM public.orders o JOIN public.profiles p ON p.id = o.customer_id
   WHERE o.id = oid;

  SELECT value INTO r_sales FROM public.app_settings WHERE key = 'tax_sales_rate';
  SELECT value INTO r_fed   FROM public.app_settings WHERE key = 'tax_federal_rate';
  SELECT value INTO r_ag    FROM public.app_settings WHERE key = 'tax_state_ag_rate';
  r_sales := COALESCE(r_sales, 0.0825);
  r_fed   := COALESCE(r_fed, 0);
  r_ag    := COALESCE(r_ag, 0);

  t := CASE
         WHEN v_tier IN ('retail_tax_exempt', 'contractor_tax_exempt') THEN 0
         WHEN v_tier = 'ag_tax_exempt' THEN round(sub * (r_fed + r_ag), 2)
         ELSE round(sub * r_sales, 2)
       END;

  UPDATE public.orders SET subtotal = sub, tax = t, total = sub + t WHERE id = oid;
  RETURN NULL;
END;
$$;
-- The AFTER INSERT/UPDATE/DELETE trigger from migration 040 already binds this
-- function by name, so replacing the body above is enough.
