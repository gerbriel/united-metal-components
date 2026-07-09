-- ============================================================
-- Migration 032: Overstock panel inventory
-- ============================================================
-- Pre-made ("overstock") panels are discrete, already-cut sheet-metal pieces
-- whose lengths are fixed by whatever was previously fabricated. They come in
-- varying colors, lengths, and quantities, each potentially at its own price.
--
-- This mirrors the tube_bundles model (migration 008): one row per overstock
-- "listing" — a batch of identical pieces (same product/color/length) with a
-- quantity on hand and an optional own price. Sold through the normal
-- cart → quote/order flow; staff decrement quantity on fulfillment.
--
-- Traceability: an optional source-coil / vendor / PO link ties an overstock
-- sale back to coil → PO → vendor/ASTM. Prices, coil, vendor, and PO are all
-- staff-only (never exposed to customers) — see the public RPC below.

-- ── 1. Overstock listings ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.panel_overstock (
  id           BIGSERIAL PRIMARY KEY,
  product_id   BIGINT NOT NULL REFERENCES public.products(id),
  color        TEXT,                                              -- COLORS palette name; NULL = bare
  length_ft    INTEGER NOT NULL,
  length_in    INTEGER NOT NULL DEFAULT 0 CHECK (length_in BETWEEN 0 AND 11),
  quantity     INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),  -- physical pieces on hand
  unit_price   NUMERIC(10,2),                                     -- staff-only, per piece
  coil_id      BIGINT REFERENCES public.product_coils(id)    ON DELETE SET NULL,  -- traceability
  vendor_id    UUID   REFERENCES public.vendors(id)          ON DELETE SET NULL,  -- staff-only
  po_id        UUID   REFERENCES public.purchase_orders(id)  ON DELETE SET NULL,  -- staff-only
  notes        TEXT,
  archived     BOOLEAN NOT NULL DEFAULT false,
  received_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  received_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.panel_overstock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage panel overstock"
  ON public.panel_overstock FOR ALL USING (public.is_staff());

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.panel_overstock;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public.panel_overstock REPLICA IDENTITY FULL;

-- ── 2. Link order lines to the overstock batch they draw from ─
-- Mirrors order_items.coil_id / tube_bundle_id (migration 008).
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS panel_overstock_id BIGINT
    REFERENCES public.panel_overstock(id) ON DELETE SET NULL;

-- ── 3. Public availability RPC ───────────────────────────────
-- panel_overstock and order_items are staff-only under RLS, so the anonymous
-- storefront cannot read them to show what's in stock. This SECURITY DEFINER
-- function returns ONLY the net available count per listing — physical
-- quantity minus pieces committed to open (unfulfilled) orders. It exposes the
-- row id (needed so the cart can reference the exact batch) but NEVER price,
-- coil, vendor, or PO. Open-order statuses match public_coil_availability (025).
CREATE OR REPLACE FUNCTION public.public_panel_overstock()
RETURNS TABLE (
  id            bigint,
  product_id    bigint,
  color         text,
  length_ft     integer,
  length_in     integer,
  available_qty integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH committed AS (
    SELECT oi.panel_overstock_id, SUM(oi.quantity) AS qty
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.panel_overstock_id IS NOT NULL
      AND o.status IN ('pending', 'confirmed', 'processing', 'ready_for_pickup', 'loading')
    GROUP BY oi.panel_overstock_id
  )
  SELECT po.id,
         po.product_id,
         po.color,
         po.length_ft,
         po.length_in,
         GREATEST(0, po.quantity - COALESCE(c.qty, 0))::int AS available_qty
  FROM panel_overstock po
  LEFT JOIN committed c ON c.panel_overstock_id = po.id
  WHERE NOT po.archived
    AND po.quantity > 0;
$$;

GRANT EXECUTE ON FUNCTION public.public_panel_overstock() TO anon, authenticated;
