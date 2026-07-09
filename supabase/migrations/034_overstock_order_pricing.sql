-- ============================================================
-- Migration 034: Price overstock order lines + keep order totals in sync
-- ============================================================
-- Overstock panels are priced per-listing (panel_overstock.unit_price), which is
-- staff-only under RLS. The storefront checkout runs as the customer, so it can't
-- read that price and stores 0 on the order line — leaving submitted overstock
-- orders (and their totals) showing $0.00 for staff.
--
-- Fix server-side: a SECURITY DEFINER trigger back-fills the real price from the
-- listing whenever an order line references one, and a second trigger recomputes
-- the parent order's subtotal / tax / total from its line items (so overstock —
-- and every product — totals add up). Requires migrations 032 + 033.

-- 1) Price an overstock order line from its listing on insert. SECURITY DEFINER
--    so it can read the staff-only panel_overstock price even when a customer
--    is the one inserting the order.
CREATE OR REPLACE FUNCTION public.price_overstock_order_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  listing_price numeric(10,2);
BEGIN
  IF new.panel_overstock_id IS NOT NULL THEN
    SELECT unit_price INTO listing_price
      FROM public.panel_overstock
     WHERE id = new.panel_overstock_id;
    IF listing_price IS NOT NULL THEN
      new.unit_price  := listing_price;
      new.total_price := listing_price * new.quantity;
    END IF;
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_price_overstock_order_item ON public.order_items;
CREATE TRIGGER trg_price_overstock_order_item
  BEFORE INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.price_overstock_order_item();

-- 2) Recompute the parent order's totals from its line items. Tax rate mirrors
--    the checkout (8.25%). Fires on insert/update only — order_items are never
--    deleted individually (whole orders cascade-delete), so skipping DELETE
--    avoids fighting the cascade.
CREATE OR REPLACE FUNCTION public.recompute_order_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  oid bigint := new.order_id;
  sub numeric(10,2);
  t   numeric(10,2);
BEGIN
  SELECT COALESCE(SUM(total_price), 0) INTO sub
    FROM public.order_items WHERE order_id = oid;
  t := round(sub * 0.0825, 2);
  UPDATE public.orders
     SET subtotal = sub, tax = t, total = sub + t
   WHERE id = oid;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_recompute_order_totals ON public.order_items;
CREATE TRIGGER trg_recompute_order_totals
  AFTER INSERT OR UPDATE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.recompute_order_totals();

-- 3) Back-fill already-submitted overstock lines that stored $0, then recompute
--    the totals of every order that has an overstock line.
UPDATE public.order_items oi
   SET unit_price  = po.unit_price,
       total_price = po.unit_price * oi.quantity
  FROM public.panel_overstock po
 WHERE oi.panel_overstock_id = po.id
   AND po.unit_price IS NOT NULL
   AND COALESCE(oi.unit_price, 0) = 0;

UPDATE public.orders o
   SET subtotal = s.sub,
       tax      = round(s.sub * 0.0825, 2),
       total    = s.sub + round(s.sub * 0.0825, 2)
  FROM (
    SELECT order_id, COALESCE(SUM(total_price), 0) AS sub
      FROM public.order_items
     GROUP BY order_id
  ) s
 WHERE s.order_id = o.id
   AND o.id IN (SELECT order_id FROM public.order_items WHERE panel_overstock_id IS NOT NULL);
