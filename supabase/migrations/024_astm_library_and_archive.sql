-- ============================================================
-- Migration 024: ASTM code library + archive (soft-delete) support
-- ============================================================

-- ── 1. ASTM code library ─────────────────────────────────────
-- A curated list of ASTM specs staff can favorite so they auto-surface
-- when receiving coils. `category` optionally scopes a code to a coil
-- category (NULL = applies to any). Favorites sort first; the top favorite
-- for a category is preselected on the receiving form.
CREATE TABLE IF NOT EXISTS public.astm_codes (
  id          BIGSERIAL PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,
  description TEXT,
  category    TEXT CHECK (category IN ('panel', 'hat_channel_brace', 'tube')),
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  archived    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.astm_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage ASTM codes"
  ON public.astm_codes FOR ALL USING (public.is_staff());

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.astm_codes;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public.astm_codes REPLICA IDENTITY FULL;

-- Seed a small set of common specs, a few favorited by default.
INSERT INTO public.astm_codes (code, description, category, is_favorite, sort_order) VALUES
  ('A792 AZ50',        'Galvalume sheet (55% Al-Zn coated)',       'panel',             TRUE,  1),
  ('A653 G90',         'Galvanized sheet, G90 zinc coating',       'panel',             TRUE,  2),
  ('A1011 CS Type B',  'Hot-rolled carbon steel sheet',            'hat_channel_brace', TRUE,  1),
  ('A500 Grade B',     'Cold-formed welded structural tubing',     'tube',              TRUE,  1),
  ('A500 Grade C',     'Cold-formed welded structural tubing',     'tube',              FALSE, 2)
ON CONFLICT (code) DO NOTHING;

-- ── 2. Archive (soft-delete) columns ─────────────────────────
-- Coils, tube bundles, and tube specs are referenced by orders/POs, so they
-- are archived rather than deleted by default. Products already use `active`.
ALTER TABLE public.product_coils
  ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.tube_bundles
  ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.tube_specs
  ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE;
