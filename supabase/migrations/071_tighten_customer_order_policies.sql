-- ============================================================
-- Migration 071: Tighten the customer policies added in 070
-- ============================================================
-- Review of 070 found both new customer policies broader than their single
-- intended use, and the gap is reachable: these tables are exposed through
-- PostgREST with the customer's own JWT, so RLS is the only gate.
--
-- 1. History INSERT let a customer insert ANY status row on their own orders
--    at any time — fabricated "Completed"/"Ready" entries (with arbitrary
--    notes, even a staff changed_by, since FK checks bypass RLS) would render
--    indistinguishably from real staff activity in both the customer Activity
--    card and the staff Status History feed. Checkout needs exactly one shape:
--    the "Order placed" row on a still-pending order.
--
-- 2. The DELETE policy let a customer hard-delete any of their pending orders
--    — including one staff are mid-review on, cascading away its items and
--    audit history. The checkout rollback only ever deletes an ITEM-LESS
--    shell (the line-items insert is one atomic statement; if it fails, zero
--    items exist), so scope the policy to exactly that.

DROP POLICY IF EXISTS "Customers insert own order history" ON public.order_status_history;
CREATE POLICY "Customers insert own order history"
  ON public.order_status_history FOR INSERT
  WITH CHECK (
    new_status = 'pending'
    AND old_status IS NULL
    AND (changed_by IS NULL OR changed_by = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
        AND o.customer_id = auth.uid()
        AND o.status = 'pending'
    )
  );

DROP POLICY IF EXISTS "Customers delete own pending orders" ON public.orders;
CREATE POLICY "Customers delete own pending orders"
  ON public.orders FOR DELETE
  USING (
    auth.uid() = customer_id
    AND status = 'pending'
    AND NOT EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.order_id = id)
  );
