-- Agricultural tax becomes a DEDUCTION off the standard rate.
--
-- Migration 046 taxed ag customers at (federal + state-ag) directly. Per the
-- business rule, the ag amount is instead SUBTRACTED from the standard sales
-- rate, giving a reduced effective rate — e.g. standard 9% − ag 5% = 4% on the
-- retail-based subtotal. Floored at 0 so a large ag deduction can't go negative.
--
-- Only the ag branch of recompute_order_totals changes; the rest mirrors 046.
-- The AFTER INSERT/UPDATE/DELETE trigger from migration 040 binds this function
-- by name, so replacing the body is enough. This changes future recomputes; to
-- restate historical orders, touch their order_items (or re-save them).
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
         -- ag: standard rate minus the ag deduction (federal + state-ag), floored at 0
         WHEN v_tier = 'ag_tax_exempt' THEN round(sub * GREATEST(r_sales - (r_fed + r_ag), 0), 2)
         ELSE round(sub * r_sales, 2)
       END;

  UPDATE public.orders SET subtotal = sub, tax = t, total = sub + t WHERE id = oid;
  RETURN NULL;
END;
$$;
