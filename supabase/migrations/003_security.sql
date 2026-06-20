-- ── Security hardening migration ──────────────────────────────
-- Run after 001_initial_schema.sql and 002_seed_products.sql
-- Uses DO blocks so re-running is safe (duplicate constraints are skipped).

-- ── 1. Data integrity constraints ─────────────────────────────

-- Products: no negative prices or stock
DO $$ BEGIN
  ALTER TABLE public.products ADD CONSTRAINT products_price_non_negative   CHECK (price >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.products ADD CONSTRAINT products_stock_non_negative   CHECK (stock_qty >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Orders: totals must be positive
DO $$ BEGIN
  ALTER TABLE public.orders ADD CONSTRAINT orders_subtotal_non_negative    CHECK (subtotal >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.orders ADD CONSTRAINT orders_total_non_negative       CHECK (total >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Order items: quantity and price must be positive
DO $$ BEGIN
  ALTER TABLE public.order_items ADD CONSTRAINT order_items_qty_positive   CHECK (quantity > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.order_items ADD CONSTRAINT order_items_price_positive CHECK (unit_price >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 2. Email format validation ─────────────────────────────────

DO $$ BEGIN
  ALTER TABLE public.newsletter_subscribers
    ADD CONSTRAINT subscribers_email_format
    CHECK (email ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 3. HTML injection prevention ──────────────────────────────
-- Block angle brackets in user-supplied text fields that get rendered.
-- React escapes by default, but defense-in-depth at the DB layer.

DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_fullname_no_html
    CHECK (full_name IS NULL OR full_name !~ '<[^>]*>');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.crm_notes
    ADD CONSTRAINT crm_notes_no_script
    CHECK (content !~* '<script');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.orders
    ADD CONSTRAINT orders_notes_no_script
    CHECK (notes IS NULL OR notes !~* '<script');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 4. Tighten RLS — ensure no table is accidentally public ───

-- Confirm analytics_events is insert-only for anon (read requires auth)
DO $$ BEGIN
  CREATE POLICY "analytics_no_public_read"
    ON public.analytics_events
    FOR SELECT
    USING (auth.uid() IS NOT NULL AND is_staff());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Social posts: staff only (already in 001, re-affirm)
DO $$ BEGIN
  CREATE POLICY "social_posts_staff_only"
    ON public.social_posts
    FOR ALL
    USING (is_staff())
    WITH CHECK (is_staff());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CRM notes: staff only
DO $$ BEGIN
  CREATE POLICY "crm_notes_staff_only"
    ON public.crm_notes
    FOR ALL
    USING (is_staff())
    WITH CHECK (is_staff());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 5. Revoke public schema execution from anon ────────────────
-- Prevents anonymous callers from executing arbitrary functions.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- Re-grant only what anon legitimately needs (none — all auth goes through Supabase Auth API)
-- Authenticated users keep their grants via Supabase's default role setup.

-- ── 6. Lock down auth schema access ───────────────────────────
-- Prevent reading auth.users directly from the API layer.
REVOKE SELECT ON auth.users FROM anon, authenticated;
