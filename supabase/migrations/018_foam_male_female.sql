-- Split the combined "Inner/Outer Foam Strips" item into two products:
-- male (inside) and female (outside) closure strips, die-cut to the L5 panel
-- profile. Prices carry over from the items they replace.

-- Soft-delete the combined SKUs (replaced by the pair below)
UPDATE public.products SET active = false WHERE sku IN ('FOAM-STRIP', 'FOAM-ENC');

INSERT INTO public.products (sku, name, category_id, description, unit, price, price_contractor, stock_qty, active) VALUES
  ('FOAM-MALE',   'Foam Closure Strip - Male (Inside)',
    (SELECT id FROM public.product_categories WHERE slug='foam'),
    'Black 2" wide inside foam closure strip, die-cut to the L5 panel profile (fills the ribs from below)',
    'Foot', 1.73, 1.50, 200, true),
  ('FOAM-FEMALE', 'Foam Closure Strip - Female (Outside)',
    (SELECT id FROM public.product_categories WHERE slug='foam'),
    'Black 2" wide outside foam closure strip, die-cut to the L5 panel profile (caps over the ribs)',
    'Foot', 1.73, 1.50, 200, true)
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  price_contractor = EXCLUDED.price_contractor,
  active = true;
