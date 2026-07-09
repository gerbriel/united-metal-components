-- Migration 036: Merge overstock back into the single overstock panel product
-- ============================================================================
-- Reverts migration 035's dedicated 'overstock' nav category. Overstock stays a
-- single product (the "29 GA Sheet Metal Overstock" panel) whose individual
-- pieces live in panel_overstock — it is NOT its own category. The product
-- returns to the Panels category.
--
-- Idempotent: re-homes the product and drops the empty category only if present.

-- 1. Move the overstock product back under Panels.
UPDATE public.products
SET category_id = (SELECT id FROM public.product_categories WHERE slug = 'panels')
WHERE sku = 'PANEL-29GA-OVERSTOCK';

-- 2. Drop the now-empty Overstock category (guarded: only if nothing points at it).
DELETE FROM public.product_categories pc
WHERE pc.slug = 'overstock'
  AND NOT EXISTS (SELECT 1 FROM public.products p WHERE p.category_id = pc.id);
