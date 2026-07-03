-- New walk-in door options + the heavy-duty door's hardware set.
-- Names/descriptions are intentionally material-free (only the 3D model reflects the
-- look). PRICES BELOW ARE PLACEHOLDERS — adjust price / price_contractor before this
-- goes in front of customers. Idempotent via ON CONFLICT so it can be re-run safely.
insert into public.products
  (sku, name, category_id, description, unit, weight_lbs, price, price_contractor, stock_qty, active)
values
  ('WALKIN-DOOR-FV',      'Flush Walk-in Door',   (select id from public.product_categories where slug='doors-hardware'), '36" x 80"',                 'Each', null, 320.00, 280.00, 0, true),
  ('WALKIN-DOOR-9LITE',   'Cottage Walk-in Door', (select id from public.product_categories where slug='doors-hardware'), '36" x 80" · 9-lite',        'Each', null, 420.00, 370.00, 0, true),
  ('WALKIN-DOOR-DIAMOND', 'Diamond Walk-in Door', (select id from public.product_categories where slug='doors-hardware'), '36" x 80" · diamond lite',  'Each', null, 400.00, 350.00, 0, true),
  ('DOOR-HW-HD',          'Heavy Duty Door Hardware', (select id from public.product_categories where slug='doors-hardware'), 'Heavy Duty Door Hardware Set', 'Each', null, 85.00, 74.00, 0, true)
on conflict (sku) do update set
  name = excluded.name,
  category_id = excluded.category_id,
  description = excluded.description,
  active = excluded.active;
