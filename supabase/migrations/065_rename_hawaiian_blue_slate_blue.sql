-- ============================================================
-- Migration 065: Rename finish "Hawaiian Blue" → "Slate Blue"
-- ============================================================
-- Display-name change only — same hex, same finish class, same pricing. The
-- finishes row keeps its id (finish_id FKs on order_items / product_coils /
-- purchase_order_items / panel_overstock / trim_stock are untouched); only the
-- name + slug change. The free-text color columns that store the NAME are
-- rewritten so name-based lookups (availability RPCs, swatch/hex resolution,
-- migration-056-style backfills) keep matching. The app additionally keeps a
-- legacy alias (product-config canonicalColorName) so any string this misses
-- still resolves.
-- Idempotent: every statement is a no-op once applied.

UPDATE public.finishes
   SET name = 'Slate Blue', slug = 'slate-blue'
 WHERE slug = 'hawaiian-blue';

UPDATE public.order_items          SET item_color = 'Slate Blue' WHERE item_color = 'Hawaiian Blue';
UPDATE public.product_coils        SET color      = 'Slate Blue' WHERE color      = 'Hawaiian Blue';
UPDATE public.purchase_order_items SET color      = 'Slate Blue' WHERE color      = 'Hawaiian Blue';
UPDATE public.panel_overstock      SET color      = 'Slate Blue' WHERE color      = 'Hawaiian Blue';

-- Cart lines carry the color inside the items JSONB — replace the exact quoted
-- value only.
UPDATE public.carts
   SET items = replace(items::text, '"Hawaiian Blue"', '"Slate Blue"')::jsonb
 WHERE items::text LIKE '%"Hawaiian Blue"%';
