-- Remove the standalone "Walk-in Door Hardware" (butt hinge) and "Walk-in Door Knob"
-- from the storefront. Soft delete (active = false) rather than DELETE so any existing
-- order_items / inventory rows that reference these SKUs stay intact. The public
-- storefront queries all filter on active = true, so these disappear from listings,
-- category pages, and search while remaining in historical orders.
update public.products
set active = false
where sku in ('WALKIN-HW', 'WALKIN-KNOB');
