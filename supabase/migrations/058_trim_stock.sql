-- ============================================================
-- Migration 058: Per-color trim stock (`trim_stock`)
-- ============================================================
-- Trim (TRIM-BOX-EVE, TRIM-CORNER, TRIM-FLASHING, TRIM-J, TRIM-L,
-- TRIM-SIDE-VERT, RIDGE-CAP) is colorable but had NO per-color inventory: it was
-- a plain product with a single colorless products.stock_qty, and coil_category
-- has no 'trim' value. Physically trim is slit from the SAME painted coils as
-- panels, but it uses only a narrow strip of the coil width, so it does not
-- consume coil footage the way a full-width panel does.
--
-- Rather than fold trim into the panel coil math (which would need width-aware
-- weight accounting), this tracks trim as a lightweight per-color piece count —
-- a simplified panel_overstock. It is INDEPENDENT of the coil pool by design;
-- the trade-off is that panel coil footage slightly overstates true availability
-- because trim draws are not netted against it.
--
-- One row per (trim product, finish). finish_id is required — "bare" trim uses
-- the Galvalume finish (a real finishes row), so every trim piece has a finish.

CREATE TABLE IF NOT EXISTS public.trim_stock (
  id          BIGSERIAL PRIMARY KEY,
  product_id  INT    NOT NULL REFERENCES public.products(id)  ON DELETE CASCADE,
  finish_id   BIGINT NOT NULL REFERENCES public.finishes(id)  ON DELETE RESTRICT,
  qty         INT    NOT NULL DEFAULT 0 CHECK (qty >= 0),     -- physical pieces on hand
  notes       TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, finish_id)
);

CREATE INDEX IF NOT EXISTS trim_stock_product_idx ON public.trim_stock (product_id);
CREATE INDEX IF NOT EXISTS trim_stock_finish_idx  ON public.trim_stock (finish_id);

ALTER TABLE public.trim_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage trim stock"
  ON public.trim_stock FOR ALL USING (public.is_staff());

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.trim_stock;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public.trim_stock REPLICA IDENTITY FULL;

-- ── Public availability RPC ──────────────────────────────────────────────────
-- trim_stock and order_items are staff-only under RLS, so the anonymous
-- storefront can't read them. This SECURITY DEFINER function returns ONLY the
-- net available piece count per (product, finish) — physical qty minus pieces
-- committed to open orders (matched by finish_id). Never exposes cost/notes.
-- Mirrors public_panel_overstock (migration 032). Open-order statuses match
-- public_coil_availability (025) / public_panel_overstock (032).
CREATE OR REPLACE FUNCTION public.public_trim_availability()
RETURNS TABLE (
  product_id    bigint,
  finish_id     bigint,
  available_qty integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH committed AS (
    SELECT oi.product_id, oi.finish_id, SUM(oi.quantity) AS qty
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.finish_id IS NOT NULL
      AND o.status IN ('pending', 'confirmed', 'processing', 'ready_for_pickup', 'loading')
    GROUP BY oi.product_id, oi.finish_id
  )
  SELECT ts.product_id,
         ts.finish_id,
         GREATEST(0, ts.qty - COALESCE(c.qty, 0))::int AS available_qty
  FROM trim_stock ts
  LEFT JOIN committed c
    ON c.product_id = ts.product_id AND c.finish_id = ts.finish_id
  WHERE ts.qty > 0;
$$;

GRANT EXECUTE ON FUNCTION public.public_trim_availability() TO anon, authenticated;

-- ── Route trim-stock + finishes edits through the approval queue ─────────────
-- Migration 053 lets office employees propose inventory changes as 'record'
-- entries an admin applies. Extend the target_table allow-list so trim stock and
-- the finishes palette are proposable the same way. (The column CHECK is
-- auto-named <table>_<column>_check.)
ALTER TABLE public.inventory_entries
  DROP CONSTRAINT IF EXISTS inventory_entries_target_table_check;
ALTER TABLE public.inventory_entries
  ADD CONSTRAINT inventory_entries_target_table_check
  CHECK (target_table IN (
    'products', 'product_coils', 'tube_specs', 'tube_bundles',
    'panel_overstock', 'astm_codes', 'trim_stock', 'finishes'
  ));
