-- ============================================================
-- Migration 038: Staff-created customers + staff order builder
-- ============================================================
-- Lets employees create customer records (walk-in, no login) and place orders
-- on behalf of customers. Real login accounts are created separately through a
-- service-role route handler; this migration covers the DB side.

-- ── 1. Allow walk-in customer profiles (no auth user) ────────
-- Real signups still set profiles.id = auth.uid() via handle_new_user; walk-ins
-- get a random uuid. Drop the profiles→auth.users FK (found by definition, so we
-- don't depend on its generated name) so a profile can exist without a login.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND contype = 'f'
      AND confrelid = 'auth.users'::regclass
  LOOP
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- ── 2. Staff creates a walk-in customer ──────────────────────
CREATE OR REPLACE FUNCTION public.staff_create_customer(
  p_first   TEXT,
  p_last    TEXT,
  p_email   TEXT,
  p_phone   TEXT,
  p_company TEXT
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid := gen_random_uuid();
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  INSERT INTO public.profiles (id, role, first_name, last_name, full_name, email, phone, company_name)
  VALUES (
    new_id,
    'customer',
    NULLIF(p_first, ''),
    NULLIF(p_last, ''),
    NULLIF(TRIM(COALESCE(p_first, '') || ' ' || COALESCE(p_last, '')), ''),
    NULLIF(p_email, ''),
    NULLIF(p_phone, ''),
    NULLIF(p_company, '')
  );
  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.staff_create_customer(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- ── 3. Staff can create orders on behalf of customers ────────
DROP POLICY IF EXISTS "Staff create orders" ON public.orders;
CREATE POLICY "Staff create orders" ON public.orders
  FOR INSERT WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Staff insert order items" ON public.order_items;
CREATE POLICY "Staff insert order items" ON public.order_items
  FOR INSERT WITH CHECK (public.is_staff());

-- ── 4. Respect staff-entered prices on overstock lines ───────
-- Only auto-fill from the listing when no price was provided (unit_price null/0),
-- so staff custom pricing wins while customer checkout (sends 0) still auto-prices.
CREATE OR REPLACE FUNCTION public.price_overstock_order_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  listing_price numeric(10,2);
BEGIN
  IF new.panel_overstock_id IS NOT NULL AND COALESCE(new.unit_price, 0) = 0 THEN
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

-- ── 5. Tax-exempt customers get 0 tax in the recomputed totals ─
CREATE OR REPLACE FUNCTION public.recompute_order_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  oid    bigint := new.order_id;
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
