-- ============================================================
-- Migration 040: Let staff correct order-line prices before fulfillment
-- ============================================================
-- order_items only had INSERT + SELECT policies, so the admin Order price editor
-- (dashboard/orders/[id]) could never actually persist a price fix or line
-- removal — a client UPDATE/DELETE was silently filtered to 0 rows by RLS.
-- Add staff UPDATE/DELETE policies (UI gates the editor to admins on pre-
-- fulfillment orders; RLS mirrors the existing is_staff() line-item policies).
--
-- The order total is owned by the recompute_order_totals trigger (migration 038),
-- which fired only on INSERT/UPDATE — so removing a line left the parent order's
-- subtotal/tax/total stale. Extend it to DELETE and make it OLD/NEW-safe, so the
-- database stays the single source of truth for totals (checkout, OrderBuilder,
-- and the price editor all rely on it) regardless of how a line changes.

-- ── 1. Staff can update / delete order lines ─────────────────
DROP POLICY IF EXISTS "Staff update order items" ON public.order_items;
CREATE POLICY "Staff update order items" ON public.order_items
  FOR UPDATE USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Staff delete order items" ON public.order_items;
CREATE POLICY "Staff delete order items" ON public.order_items
  FOR DELETE USING (public.is_staff());

-- ── 2. Recompute totals on DELETE too (OLD/NEW-safe) ─────────
CREATE OR REPLACE FUNCTION public.recompute_order_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  oid    bigint := COALESCE(new.order_id, old.order_id);  -- new is NULL on DELETE
  sub    numeric(10,2);
  t      numeric(10,2);
  v_tier text;
BEGIN
  SELECT COALESCE(SUM(total_price), 0) INTO sub
    FROM public.order_items WHERE order_id = oid;
  SELECT p.pricing_tier INTO v_tier
    FROM public.orders o JOIN public.profiles p ON p.id = o.customer_id
   WHERE o.id = oid;
  t := CASE WHEN v_tier IN ('retail_tax_exempt', 'contractor_tax_exempt')
            THEN 0 ELSE round(sub * 0.0825, 2) END;
  UPDATE public.orders
     SET subtotal = sub, tax = t, total = sub + t
   WHERE id = oid;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_recompute_order_totals ON public.order_items;
CREATE TRIGGER trg_recompute_order_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.recompute_order_totals();
