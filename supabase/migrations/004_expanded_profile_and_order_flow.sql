-- ============================================================
-- Migration 004: Expanded profile, employee roles, order flow
-- ============================================================

-- ── 1. Expand profiles table ──────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name        TEXT,
  ADD COLUMN IF NOT EXISTS last_name         TEXT,
  ADD COLUMN IF NOT EXISTS company_name      TEXT,
  ADD COLUMN IF NOT EXISTS mailing_address   TEXT,
  ADD COLUMN IF NOT EXISTS business_address  TEXT;

-- ── 2. Employee role sub-type ─────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.employee_role AS ENUM ('office', 'warehouse');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS employee_role public.employee_role;

-- ── 3. Updated new-user trigger ───────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE PLPGSQL SECURITY DEFINER SET SEARCH_PATH = public AS $$
DECLARE
  v_first TEXT;
  v_last  TEXT;
BEGIN
  v_first := NEW.raw_user_meta_data->>'first_name';
  v_last  := NEW.raw_user_meta_data->>'last_name';
  INSERT INTO public.profiles (id, first_name, last_name, full_name, phone, company_name)
  VALUES (
    NEW.id,
    v_first,
    v_last,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NULLIF(TRIM(COALESCE(v_first,'') || ' ' || COALESCE(v_last,'')), '')
    ),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'company_name'
  );
  RETURN NEW;
END;
$$;

-- ── 4. New order statuses ─────────────────────────────────────
-- Adds 'ready_for_pickup' and 'loading'; legacy 'ready' stays for compat
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'ready_for_pickup' AFTER 'processing';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'loading'           AFTER 'ready_for_pickup';

-- ── 5. Customer no-defects confirmation on orders ─────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_no_defects_at TIMESTAMPTZ;

-- Allow customers to write this column on their own orders
CREATE POLICY "Customers can confirm no defects on own orders"
  ON public.orders FOR UPDATE
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

-- ── 6. Order item staging table ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_item_staging (
  id            BIGSERIAL PRIMARY KEY,
  order_id      BIGINT NOT NULL REFERENCES public.orders(id)      ON DELETE CASCADE,
  order_item_id BIGINT NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  staged_by     UUID REFERENCES public.profiles(id),
  staged_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes         TEXT,
  UNIQUE(order_item_id)
);

ALTER TABLE public.order_item_staging ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage staging"
  ON public.order_item_staging FOR ALL
  USING (public.is_staff());

-- Customers can read their own order's staging state (to show progress)
CREATE POLICY "Customers can view own order staging"
  ON public.order_item_staging FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id AND o.customer_id = auth.uid()
  ));

-- ── 7. Order item loading table (dual confirmation) ───────────
CREATE TABLE IF NOT EXISTS public.order_item_loading (
  id                    BIGSERIAL PRIMARY KEY,
  order_id              BIGINT NOT NULL REFERENCES public.orders(id)      ON DELETE CASCADE,
  order_item_id         BIGINT NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  employee_confirmed_at TIMESTAMPTZ,
  employee_confirmed_by UUID REFERENCES public.profiles(id),
  customer_confirmed_at TIMESTAMPTZ,
  customer_confirmed_by UUID REFERENCES public.profiles(id),
  UNIQUE(order_item_id)
);

ALTER TABLE public.order_item_loading ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage loading"
  ON public.order_item_loading FOR ALL
  USING (public.is_staff());

CREATE POLICY "Customers can view own order loading"
  ON public.order_item_loading FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id AND o.customer_id = auth.uid()
  ));

CREATE POLICY "Customers can upsert own order loading confirmation"
  ON public.order_item_loading FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id AND o.customer_id = auth.uid()
  ));

CREATE POLICY "Customers can update own order loading confirmation"
  ON public.order_item_loading FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id AND o.customer_id = auth.uid()
  ));

-- ── 8. Helper: is_warehouse ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_warehouse()
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND employee_role = 'warehouse'
  );
$$;

-- ── 9. Notify all staff utility ───────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_all_staff(
  p_order_id BIGINT,
  p_title    TEXT,
  p_message  TEXT
) RETURNS VOID LANGUAGE PLPGSQL SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, order_id)
  SELECT id, 'order_update', p_title, p_message, p_order_id
  FROM public.profiles
  WHERE role IN ('employee', 'admin');
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_all_staff TO authenticated;

-- ── 10. Inventory: allow warehouse employees to update ────────
-- Warehouse employees have role='employee' so is_staff() covers them.
-- No additional policy needed — existing "Staff manage inventory log" covers it.
-- The UI will differentiate who can edit based on employee_role check client-side.
