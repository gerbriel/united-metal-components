-- ============================================================
-- Migration 070: Repair silent checkout write failures
-- ============================================================
-- The live DB was missing public.app_settings (migration 046 was only partially
-- applied: the recompute_order_totals() function body referencing the table was
-- deployed, but the table itself never got created). Because that function runs
-- as an AFTER trigger on EVERY order_items INSERT/UPDATE/DELETE, every customer
-- checkout aborted its line-item insert with 42P01 — leaving orders that have
-- totals but zero items (e.g. order #12). The checkout page swallowed the error.
--
-- This migration:
--   1. Re-asserts app_settings + seed + policies (idempotent copy of 046 §1).
--   2. Lets customers write the "Order placed" history row on their own orders
--      (checkout inserts it client-side; there was no INSERT policy at all).
--   3. Lets users create notifications addressed to themselves (checkout's
--      "Order Received" notice; previously staff-only INSERT).
--   4. Lets customers delete their own still-pending orders — used by checkout
--      to roll back the orphaned order row if the line-item insert fails.

-- ── 1. app_settings (from 046, idempotent) ───────────────────
CREATE TABLE IF NOT EXISTS public.app_settings (
  key        text PRIMARY KEY,
  value      numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.app_settings (key, value) VALUES
  ('tax_sales_rate',    0.0825),
  ('tax_federal_rate',  0),
  ('tax_state_ag_rate', 0)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone reads app settings" ON public.app_settings;
CREATE POLICY "Anyone reads app settings"
  ON public.app_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins write app settings" ON public.app_settings;
CREATE POLICY "Admins write app settings"
  ON public.app_settings FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── 2. Customers log status history on their own orders ──────
DROP POLICY IF EXISTS "Customers insert own order history" ON public.order_status_history;
CREATE POLICY "Customers insert own order history"
  ON public.order_status_history FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id AND o.customer_id = auth.uid()
  ));

-- ── 3. Users notify themselves ───────────────────────────────
DROP POLICY IF EXISTS "Users insert own notifications" ON public.notifications;
CREATE POLICY "Users insert own notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ── 4. Customers may delete own orders while still pending ───
-- Pending = not yet accepted by staff; deleting cascades the (partial) items,
-- so a failed checkout can clean up after itself instead of stranding a
-- totals-only order shell in the dashboard.
DROP POLICY IF EXISTS "Customers delete own pending orders" ON public.orders;
CREATE POLICY "Customers delete own pending orders"
  ON public.orders FOR DELETE
  USING (auth.uid() = customer_id AND status = 'pending');
