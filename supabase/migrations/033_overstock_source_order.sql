-- ============================================================
-- Migration 033: Track which canceled order an overstock listing came from
-- ============================================================
-- Panels from a canceled order can be imported into overstock (see the
-- "Send panels to overstock" flow). Recording the source order lets the
-- fallback importer tell which orders have already been imported, and keeps
-- order -> overstock traceability alongside the existing coil/PO links.
--
-- Requires migration 032 (panel_overstock) to have been applied first.

ALTER TABLE public.panel_overstock
  ADD COLUMN IF NOT EXISTS source_order_id BIGINT
    REFERENCES public.orders(id) ON DELETE SET NULL;
