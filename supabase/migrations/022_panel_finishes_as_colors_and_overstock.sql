-- Galvalume and Stone are now offered as COLOR options on the base 29 GA Sheet
-- Metal panel (PANEL-29GA, which already carries the color picker) instead of
-- standing on their own. Soft-delete (active = false) the two standalone finish
-- SKUs rather than DELETE, so any historical order_items / inventory rows that
-- reference them stay intact. Every public storefront query filters on
-- active = true, so they drop out of listings, category pages, and search; the
-- product-detail page now also 404s inactive products, so their old
-- /products/:id URLs stop resolving too.
update public.products
set active = false
where sku in ('PANEL-GALVALUME', 'PANEL-STONE');

-- "Scrap" reads as defective to customers; this 29 GA offcut panel is really sold
-- as discounted overstock. Rename the product and its description to match.
update public.products
set name = '29 GA Sheet Metal Overstock',
    description = '29 Gauge Painted Sheet Metal - Overstock'
where sku = 'PANEL-29GA-SCRAP';
