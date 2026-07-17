-- ============================================================
-- Migration 064: Receive standard products against POs
-- ============================================================
-- Standard products (fasteners, doors/windows, moisture barrier — product_type
-- 'standard') had no receiving path: stock_qty was only ever SET to an absolute
-- value, purchase_order_items.quantity_received was never written, and there was
-- no receipt history. This adds:
--   1. product_receipts — an append-only log of each standard-product receipt,
--      optionally tied to a PO line + vendor + receipt document (traceability:
--      stock -> PO -> vendor, matching how coils/bundles carry their source).
--   2. receive_standard_product() — one ATOMIC action that increments stock, logs
--      the receipt, credits the PO line's quantity_received, and advances the PO
--      to 'partial' / 'received'. SECURITY DEFINER so a warehouse receiver (with
--      profiles.can_receive_inventory) can receive without direct products write
--      access — mirroring how coil/bundle receiving bypasses the approval queue.

-- ── 1. Receipt log ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.product_receipts (
  id           BIGSERIAL PRIMARY KEY,
  product_id   INT     NOT NULL REFERENCES public.products(id)             ON DELETE CASCADE,
  quantity     INT     NOT NULL CHECK (quantity > 0),
  po_id        UUID    REFERENCES public.purchase_orders(id)               ON DELETE SET NULL,
  po_item_id   UUID    REFERENCES public.purchase_order_items(id)          ON DELETE SET NULL,
  vendor_id    UUID    REFERENCES public.vendors(id)                       ON DELETE SET NULL,
  receipt_path TEXT,                                    -- doc in the receiving-docs bucket
  notes        TEXT,
  received_by  UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  received_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS product_receipts_product_idx ON public.product_receipts (product_id, received_at DESC);
CREATE INDEX IF NOT EXISTS product_receipts_po_idx      ON public.product_receipts (po_id);

ALTER TABLE public.product_receipts ENABLE ROW LEVEL SECURITY;
-- Staff read the history; writes happen ONLY through receive_standard_product().
DROP POLICY IF EXISTS "Staff read product receipts" ON public.product_receipts;
CREATE POLICY "Staff read product receipts"
  ON public.product_receipts FOR SELECT USING (public.is_staff());

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.product_receipts;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public.product_receipts REPLICA IDENTITY FULL;

-- ── 2. Atomic receive action ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.receive_standard_product(
  p_product_id   int,
  p_qty          int,
  p_po_item_id   uuid default null,
  p_po_id        uuid default null,
  p_vendor_id    uuid default null,
  p_receipt_path text default null,
  p_notes        text default null
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_po  uuid;
  v_all boolean;
BEGIN
  -- Office + admin may receive, plus any staffer flagged to receive inventory.
  IF NOT (public.is_office_or_admin() OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND COALESCE(p.can_receive_inventory, false)
  )) THEN
    RAISE EXCEPTION 'Not authorized to receive inventory';
  END IF;
  IF p_qty IS NULL OR p_qty <= 0 THEN
    RAISE EXCEPTION 'Received quantity must be positive';
  END IF;

  -- 1. Bump stock on hand.
  UPDATE public.products
     SET stock_qty = stock_qty + p_qty, updated_at = NOW()
   WHERE id = p_product_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product % not found', p_product_id; END IF;

  -- 2. Log the receipt.
  INSERT INTO public.product_receipts
    (product_id, quantity, po_id, po_item_id, vendor_id, receipt_path, notes, received_by)
  VALUES
    (p_product_id, p_qty, p_po_id, p_po_item_id, p_vendor_id, p_receipt_path, p_notes, auth.uid());

  -- 3. Credit the PO line, then advance the PO status from what's now received.
  IF p_po_item_id IS NOT NULL THEN
    UPDATE public.purchase_order_items
       SET quantity_received = COALESCE(quantity_received, 0) + p_qty
     WHERE id = p_po_item_id
     RETURNING po_id INTO v_po;

    IF v_po IS NOT NULL THEN
      SELECT NOT EXISTS (
        SELECT 1 FROM public.purchase_order_items i
        WHERE i.po_id = v_po AND COALESCE(i.quantity_received, 0) < i.quantity
      ) INTO v_all;

      UPDATE public.purchase_orders
         SET status        = CASE WHEN v_all THEN 'received' ELSE 'partial' END,
             received_date = CASE WHEN v_all THEN COALESCE(received_date, CURRENT_DATE) ELSE received_date END
       WHERE id = v_po AND status <> 'cancelled';
    END IF;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.receive_standard_product(int, int, uuid, uuid, uuid, text, text) TO authenticated;
