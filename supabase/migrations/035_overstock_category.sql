-- Migration 035: Give overstock panels their own storefront category
-- ============================================================================
-- Keeps the existing model — one "29 GA Sheet Metal Overstock" product whose
-- individual pieces live in panel_overstock — but surfaces it under its own
-- "Overstock" nav bucket so customers can find it directly (header bar, home
-- cards, footer, /products sidebar all read product_categories via
-- getNavCategories).
--
-- Appended at the end of the nav so no existing (possibly admin-customized)
-- category ordering is disturbed; reorder it from the dashboard Categories
-- manager if you want it elsewhere. Idempotent: re-running refreshes the
-- category's icon/description/visibility and re-homes the product, but never
-- overwrites its sort_order once set.

-- 1. The Overstock category (nav_visible defaults true; see migration 030).
INSERT INTO public.product_categories (name, slug, icon, description, sort_order)
SELECT 'Overstock', 'overstock', 'PackageOpen',
       'Discounted pre-made panels — limited quantities, exact sizes in stock',
       COALESCE((SELECT MAX(sort_order) FROM public.product_categories WHERE nav_visible = true), -1) + 1
ON CONFLICT (slug) DO UPDATE SET
  icon        = EXCLUDED.icon,
  description = EXCLUDED.description,
  nav_visible = true;

-- 2. Move the overstock product into it (SKU renamed in migration 034).
UPDATE public.products
SET category_id = (SELECT id FROM public.product_categories WHERE slug = 'overstock')
WHERE sku = 'PANEL-29GA-OVERSTOCK';
