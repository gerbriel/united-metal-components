-- Migration 034: Rename the overstock panel SKU (SCRAP → OVERSTOCK)
-- ============================================================================
-- The pre-made overstock panel product was historically SKU'd PANEL-29GA-SCRAP
-- (seed 002). Migration 022 already renamed its display name to "29 GA Sheet
-- Metal Overstock"; this brings the SKU in line with that name.
--
-- The storefront keys the overstock flow off this SKU (OVERSTOCK_SKUS in
-- src/lib/product-config.ts) — updated in the same change so code and data agree.
-- Idempotent: only renames if the old SKU is still present.

UPDATE public.products
SET sku = 'PANEL-29GA-OVERSTOCK'
WHERE sku = 'PANEL-29GA-SCRAP';
