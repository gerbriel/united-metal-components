-- ============================================================
-- Migration 066: Rename finish "Zinc Gray" → "Quaker Gray"
-- ============================================================
-- Display-name change only — same hex, same finish class, same pricing. Mirrors
-- migration 065 (Hawaiian Blue → Slate Blue): the finishes row keeps its id
-- (finish_id FKs untouched), only name + slug change, and the free-text color
-- columns storing the NAME are rewritten so name-based lookups keep matching.
-- The app keeps a legacy alias (product-config canonicalColorName) for anything
-- missed — which also stops legacy "Zinc Gray" strings from hitting the 'zinc'
-- bare-metal substring fallback in the 3D materials (it is a painted solid).
-- Idempotent: every statement is a no-op once applied.

UPDATE public.finishes
   SET name = 'Quaker Gray', slug = 'quaker-gray'
 WHERE slug = 'zinc-gray';

UPDATE public.order_items          SET item_color = 'Quaker Gray' WHERE item_color = 'Zinc Gray';
UPDATE public.product_coils        SET color      = 'Quaker Gray' WHERE color      = 'Zinc Gray';
UPDATE public.purchase_order_items SET color      = 'Quaker Gray' WHERE color      = 'Zinc Gray';
UPDATE public.panel_overstock      SET color      = 'Quaker Gray' WHERE color      = 'Zinc Gray';

-- Cart lines carry the color inside the items JSONB — replace the exact quoted
-- value only.
UPDATE public.carts
   SET items = replace(items::text, '"Zinc Gray"', '"Quaker Gray"')::jsonb
 WHERE items::text LIKE '%"Zinc Gray"%';
