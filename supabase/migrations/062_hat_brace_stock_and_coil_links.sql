-- ============================================================
-- Migration 062: Per-length hat/brace stock + source-coil links
-- ============================================================
-- Two related additions so trim and hat-channel/brace stock can be tracked as
-- editable line items per variation, each traceable to the coil it was cut from:
--
--   1. trim_stock (migration 058, per color) gains an optional source coil_id,
--      matching panel_overstock's traceability (a trim piece is cut from a PANEL
--      coil — panels and trim share painted coils).
--   2. hat_brace_stock: pre-cut hat-channel / brace pieces counted per LENGTH
--      (colorless — they come off the shared hat_channel_brace coil pool). This
--      sits ALONGSIDE that coil pool (footage for cut-to-order) the way overstock
--      panels sit alongside panel coils. Each row optionally links its source coil.

-- ── 1. Source coil on trim stock ─────────────────────────────────────────────
ALTER TABLE public.trim_stock
  ADD COLUMN IF NOT EXISTS coil_id BIGINT REFERENCES public.product_coils(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS trim_stock_coil_idx ON public.trim_stock (coil_id);

-- ── 2. Per-length hat/brace piece stock ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hat_brace_stock (
  id          BIGSERIAL PRIMARY KEY,
  product_id  INT     NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  length_ft   INTEGER NOT NULL CHECK (length_ft > 0),           -- preset cut length (whole feet)
  qty         INTEGER NOT NULL DEFAULT 0 CHECK (qty >= 0),       -- pieces on hand
  coil_id     BIGINT REFERENCES public.product_coils(id) ON DELETE SET NULL,  -- source coil (traceability)
  notes       TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, length_ft)
);

CREATE INDEX IF NOT EXISTS hat_brace_stock_product_idx ON public.hat_brace_stock (product_id);
CREATE INDEX IF NOT EXISTS hat_brace_stock_coil_idx    ON public.hat_brace_stock (coil_id);

ALTER TABLE public.hat_brace_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage hat/brace stock"
  ON public.hat_brace_stock FOR ALL USING (public.is_staff());

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.hat_brace_stock;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public.hat_brace_stock REPLICA IDENTITY FULL;

-- ── 3. Approval-queue allow-list ─────────────────────────────────────────────
-- Let office employees propose hat/brace stock changes through the queue
-- (migrations 053/058), applied generically by an admin.
ALTER TABLE public.inventory_entries
  DROP CONSTRAINT IF EXISTS inventory_entries_target_table_check;
ALTER TABLE public.inventory_entries
  ADD CONSTRAINT inventory_entries_target_table_check
  CHECK (target_table IN (
    'products', 'product_coils', 'tube_specs', 'tube_bundles',
    'panel_overstock', 'astm_codes', 'trim_stock', 'finishes', 'hat_brace_stock'
  ));
