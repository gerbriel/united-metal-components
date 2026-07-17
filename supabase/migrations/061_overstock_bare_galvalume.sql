-- ============================================================
-- Migration 061: Bare overstock panels ARE Galvalume
-- ============================================================
-- panel_overstock stores its finish as a free-text color NAME, with NULL meaning
-- a bare / unpainted panel. Migration 056 added a nullable finish_id FK and
-- backfilled it by matching that color NAME to `finishes` — so bare rows
-- (color IS NULL) never matched anything and were left with finish_id = NULL.
--
-- Physically there is no such thing as a "no finish" panel: a bare, unpainted
-- overstock panel IS bare metal, i.e. the Galvalume finish (finishes.slug =
-- 'galvalume', finish_class 'galvalume'). Backfill those rows so they carry the
-- correct FK for pricing/traceability, while their color text stays NULL (bare).
--
-- Idempotent: the WHERE clause only touches still-unlinked bare rows, so re-runs
-- are no-ops. The Galvalume id is resolved via subselect on the stable slug.

UPDATE public.panel_overstock po
  SET finish_id = (SELECT id FROM public.finishes WHERE slug = 'galvalume')
  WHERE po.finish_id IS NULL
    AND po.color IS NULL;
