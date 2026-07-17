-- ============================================================
-- Migration 056: Link color-bearing rows to `finishes` (additive FKs)
-- ============================================================
-- Adds a nullable finish_id FK to every table that currently stores a finish as
-- a free-text color NAME, and backfills it by matching that name to finishes.
-- The original text columns are KEPT: they preserve history, cover legacy/typo'd
-- values that don't map to a current finish (e.g. the divergent TV-board palette,
-- free-text PO strings), and remain the display value. New app writes should set
-- BOTH finish_id and the text name.
--
-- ON DELETE SET NULL: removing a finish must never delete an order/coil/PO line.
-- carts.items is JSONB (no column) — handled app-side when carts are written.

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS finish_id BIGINT REFERENCES public.finishes(id) ON DELETE SET NULL;
ALTER TABLE public.product_coils
  ADD COLUMN IF NOT EXISTS finish_id BIGINT REFERENCES public.finishes(id) ON DELETE SET NULL;
ALTER TABLE public.purchase_order_items
  ADD COLUMN IF NOT EXISTS finish_id BIGINT REFERENCES public.finishes(id) ON DELETE SET NULL;
ALTER TABLE public.panel_overstock
  ADD COLUMN IF NOT EXISTS finish_id BIGINT REFERENCES public.finishes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS order_items_finish_id_idx         ON public.order_items (finish_id);
CREATE INDEX IF NOT EXISTS product_coils_finish_id_idx       ON public.product_coils (finish_id);
CREATE INDEX IF NOT EXISTS purchase_order_items_finish_id_idx ON public.purchase_order_items (finish_id);
CREATE INDEX IF NOT EXISTS panel_overstock_finish_id_idx     ON public.panel_overstock (finish_id);

-- ── Backfill by case-insensitive, trimmed name match ─────────────────────────
-- Unmatched legacy strings keep finish_id = NULL (their text is preserved).
UPDATE public.order_items oi
  SET finish_id = f.id
  FROM public.finishes f
  WHERE oi.finish_id IS NULL
    AND oi.item_color IS NOT NULL
    AND lower(btrim(oi.item_color)) = lower(f.name);

UPDATE public.product_coils c
  SET finish_id = f.id
  FROM public.finishes f
  WHERE c.finish_id IS NULL
    AND c.color IS NOT NULL
    AND lower(btrim(c.color)) = lower(f.name);

UPDATE public.purchase_order_items poi
  SET finish_id = f.id
  FROM public.finishes f
  WHERE poi.finish_id IS NULL
    AND poi.color IS NOT NULL
    AND lower(btrim(poi.color)) = lower(f.name);

UPDATE public.panel_overstock po
  SET finish_id = f.id
  FROM public.finishes f
  WHERE po.finish_id IS NULL
    AND po.color IS NOT NULL
    AND lower(btrim(po.color)) = lower(f.name);
