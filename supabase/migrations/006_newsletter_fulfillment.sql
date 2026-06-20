-- ============================================================
-- Migration 006: newsletter user linking + partial fulfillment
-- ============================================================

-- ── 1. Link newsletter subscribers to user accounts ──────────
-- Enables in-app notifications when sending campaigns
ALTER TABLE public.newsletter_subscribers
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── 2. Partial fulfillment: track actual qty fulfilled ────────
-- NULL means fully fulfilled (ordered qty); set when partial
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS fulfilled_quantity INTEGER;

-- ── 3. Backfill tracking ──────────────────────────────────────
-- Created when an order item can only be partially fulfilled
CREATE TABLE IF NOT EXISTS public.order_backfill_items (
  id                  BIGSERIAL PRIMARY KEY,
  original_order_id   BIGINT NOT NULL REFERENCES public.orders(id)      ON DELETE CASCADE,
  original_item_id    BIGINT NOT NULL REFERENCES public.order_items(id)  ON DELETE CASCADE,
  product_id          BIGINT NOT NULL REFERENCES public.products(id),
  quantity_owed       INTEGER NOT NULL,
  fulfilled_at        TIMESTAMPTZ,
  fulfilled_quantity  INTEGER,
  notes               TEXT,
  created_by          UUID REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.order_backfill_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage backfill items"
  ON public.order_backfill_items FOR ALL
  USING (public.is_staff());

CREATE POLICY "Customers can view their own backfill items"
  ON public.order_backfill_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_backfill_items.original_order_id
        AND customer_id = auth.uid()
    )
  );
