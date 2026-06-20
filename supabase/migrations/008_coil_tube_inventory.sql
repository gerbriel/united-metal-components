-- ============================================================
-- Migration 008: Coil and tube inventory system
-- ============================================================
-- Product types:
--   standard        → sold per unit (doors, hardware, etc.)
--   coil            → panels, hat channel, braces — sold by linear foot from coils
--   tube            → sold by the piece in standardized lengths, bundled
--
-- Coil categories (shared table for all coil types):
--   panel            → feeds panels only
--   hat_channel_brace → feeds hat channels AND braces (shared pool)
--   tube             → feeds tubing (each coil belongs to a specific gauge)

-- ── 1. Classify products ─────────────────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_type  TEXT NOT NULL DEFAULT 'standard'
    CHECK (product_type IN ('standard', 'coil', 'tube')),
  ADD COLUMN IF NOT EXISTS coil_category TEXT
    CHECK (coil_category IN ('panel', 'hat_channel_brace', 'tube'));

-- ── 2. Coil inventory ────────────────────────────────────────
-- One table for ALL coil types. tube coils include a gauge.
-- Remaining footage = current_weight_lbs / lbs_per_linear_foot
CREATE TABLE IF NOT EXISTS public.product_coils (
  id                  BIGSERIAL PRIMARY KEY,
  coil_identifier     TEXT NOT NULL,                -- from delivery slip
  coil_category       TEXT NOT NULL
    CHECK (coil_category IN ('panel', 'hat_channel_brace', 'tube')),
  gauge               TEXT CHECK (gauge IN ('12', '14')),  -- tube coils only; NULL for panel/hat_channel_brace
  initial_weight_lbs  NUMERIC(10,2) NOT NULL,
  current_weight_lbs  NUMERIC(10,2),               -- NULL until first warehouse weigh-in
  lbs_per_linear_foot NUMERIC(10,6) NOT NULL,       -- set by admin from spec sheet / delivery data
  status              TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'depleted', 'on_hold')),
  notes               TEXT,
  received_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  received_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_weighed_at     TIMESTAMPTZ,
  last_weighed_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.product_coils ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage coils"
  ON public.product_coils FOR ALL USING (public.is_staff());

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.product_coils;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public.product_coils REPLICA IDENTITY FULL;

-- ── 3. Tube specs (per product + gauge) ──────────────────────
-- Defines pricing + available lengths for each tube product/gauge combination.
CREATE TABLE IF NOT EXISTS public.tube_specs (
  id                        BIGSERIAL PRIMARY KEY,
  product_id                BIGINT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  gauge                     TEXT NOT NULL CHECK (gauge IN ('12', '14')),
  available_lengths_ft      INTEGER[] NOT NULL DEFAULT '{20,22,24,26,30}',
  default_pieces_per_bundle INTEGER,
  price_per_linear_foot     NUMERIC(10,4) NOT NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, gauge)
);

ALTER TABLE public.tube_specs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage tube specs"
  ON public.tube_specs FOR ALL USING (public.is_staff());

-- ── 4. Tube bundle inventory ─────────────────────────────────
-- Each row = a batch of bundles of the same gauge/length received together.
-- Optionally linked to the source coil via coil_id.
-- pieces_per_bundle can vary per delivery batch.
CREATE TABLE IF NOT EXISTS public.tube_bundles (
  id                  BIGSERIAL PRIMARY KEY,
  product_id          BIGINT NOT NULL REFERENCES public.products(id),
  coil_id             BIGINT REFERENCES public.product_coils(id) ON DELETE SET NULL,
  gauge               TEXT NOT NULL CHECK (gauge IN ('12', '14')),
  length_feet         INTEGER NOT NULL,
  bundle_identifier   TEXT,                         -- from delivery slip
  pieces_per_bundle   INTEGER NOT NULL,             -- actual count for this batch
  total_bundles       INTEGER NOT NULL DEFAULT 0,
  available_bundles   INTEGER NOT NULL DEFAULT 0,
  available_pieces    INTEGER NOT NULL DEFAULT 0,   -- loose pieces from partial bundles
  price_per_bundle    NUMERIC(10,2),               -- overrides per-linear-foot pricing if set
  status              TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'depleted')),
  notes               TEXT,
  received_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  received_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tube_bundles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage tube bundles"
  ON public.tube_bundles FOR ALL USING (public.is_staff());

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.tube_bundles;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public.tube_bundles REPLICA IDENTITY FULL;

-- ── 5. Extend order_items for coil/tube detail ───────────────
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS linear_feet    NUMERIC(10,4),  -- coil products: footage ordered
  ADD COLUMN IF NOT EXISTS length_feet    INTEGER,         -- tube products: piece length (20,22,etc)
  ADD COLUMN IF NOT EXISTS coil_id        BIGINT REFERENCES public.product_coils(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tube_bundle_id BIGINT REFERENCES public.tube_bundles(id)  ON DELETE SET NULL;
