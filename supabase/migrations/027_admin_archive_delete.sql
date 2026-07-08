-- Admin archive + hard delete for orders and purchase orders.
-- Archiving hides a record from the default lists but keeps the row (and its
-- traceability links) for history; hard delete removes it permanently.

-- ── 1. Archive flags ─────────────────────────────────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS orders_archived_idx ON public.orders (archived);
CREATE INDEX IF NOT EXISTS purchase_orders_archived_idx ON public.purchase_orders (archived);

-- ── 2. Admin check helper ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ── 3. Hard-delete policies (admin only) ─────────────────────
-- orders had no DELETE policy at all; add one restricted to admins. Child rows
-- (order_items, order_status_history) are removed by ON DELETE CASCADE.
DROP POLICY IF EXISTS "Admins delete orders" ON public.orders;
CREATE POLICY "Admins delete orders"
  ON public.orders FOR DELETE USING (public.is_admin());

-- purchase_orders already carries a staff "FOR ALL" policy that permits DELETE;
-- deletes are gated to admins in the UI. purchase_order_items cascade, and
-- product_coils.po_id is ON DELETE SET NULL, so a hard-deleted PO simply drops
-- the coil's PO link (archive instead to preserve traceability).
