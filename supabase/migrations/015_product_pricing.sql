-- Migration 015: Product pricing update + catalog cleanup
-- price = retail/public, price_contractor = installer

-- ===================================================================
-- 1. SOFT-DELETE DISCONTINUED PRODUCTS
--    Using active=false rather than DELETE to preserve order history
--    (order_items.product_id has no ON DELETE CASCADE)
-- ===================================================================
UPDATE public.products SET active = false WHERE sku IN (
  'INS-1FT',
  'BASE-5FT', 'BASE-10FT', 'BASE-20FT',
  'TRUSS-18-20', 'TRUSS-22-24', 'TRUSS-26-28', 'TRUSS-30', 'TRUSS-BEND',
  'WELD-NIPPLE'
);

-- Soft-delete old generic garage door SKUs (replaced by model-specific below)
UPDATE public.products SET active = false WHERE sku IN (
  'GARAGE-6X6', 'GARAGE-8X8', 'GARAGE-9X8', 'GARAGE-10X8',
  'GARAGE-10X10', 'GARAGE-12X12', 'GARAGE-12X14', 'GARAGE-14X14'
);

-- ===================================================================
-- 2. UPDATE PRICING ON EXISTING PRODUCTS
-- ===================================================================

-- Anchors
UPDATE public.products SET price = 11.50, price_contractor = 10.00 WHERE sku = 'ASPHALT-ANCHOR';
UPDATE public.products SET price = 11.50, price_contractor = 10.00 WHERE sku = 'MHA';
UPDATE public.products SET price =  1.44, price_contractor =  1.25 WHERE sku = 'CONC-7-LONG';

-- Braces
UPDATE public.products SET price = 0.98, price_contractor = 0.85 WHERE sku = 'BRACE';

-- Bundles
UPDATE public.products SET price = 828.00, price_contractor = 720.00 WHERE sku = 'BUNDLE-PKG';

-- Doors & Hardware
UPDATE public.products SET price =  86.25, price_contractor =  75.00 WHERE sku = 'DOOR-HW';
UPDATE public.products SET price =  46.00, price_contractor =  40.00 WHERE sku = 'WALKIN-KNOB';
UPDATE public.products SET price = 264.50, price_contractor = 230.00 WHERE sku = 'WALKIN-DOOR';

-- Foam
UPDATE public.products SET price = 1.73, price_contractor = 1.50 WHERE sku = 'FOAM-ENC';

-- Inserts
UPDATE public.products SET price = 2.28, price_contractor = 1.98 WHERE sku = 'INS-7-2X2';
UPDATE public.products SET price = 2.56, price_contractor = 2.23 WHERE sku = 'INS-7-14GA';

-- Insulation
UPDATE public.products SET price = 195.50, price_contractor = 170.00 WHERE sku = 'INS-4FT-ROLL';
UPDATE public.products SET price = 254.15, price_contractor = 221.00 WHERE sku = 'INS-6FT-ROLL';

-- Panels
UPDATE public.products SET price = 3.10, price_contractor = 2.25 WHERE sku = 'PANEL-29GA';
UPDATE public.products SET price = 2.30, price_contractor = 2.00 WHERE sku = 'PANEL-29GA-SCRAP';
UPDATE public.products SET price = 2.59, price_contractor = 2.25 WHERE sku = 'PANEL-GALVALUME';

-- Rebar
UPDATE public.products SET price = 4.03, price_contractor = 3.50 WHERE sku = 'REBAR';

-- Screws
UPDATE public.products SET price = 267.95, price_contractor = 233.00 WHERE sku = 'SCREWS-BOX-W';
UPDATE public.products SET price = 230.00, price_contractor = 200.00 WHERE sku = 'SCREWS-BOX-WO';
UPDATE public.products SET price =  93.15, price_contractor =  81.00 WHERE sku = 'SCREWS-BAG-W';
UPDATE public.products SET price =  46.00, price_contractor =  40.00 WHERE sku = 'SCREWS-BAG-WO';

-- Square Tubing
UPDATE public.products SET price = 2.51, price_contractor = 2.18 WHERE sku = 'TUBE-2.0-14GA';
UPDATE public.products SET price = 2.70, price_contractor = 2.35 WHERE sku = 'TUBE-2.25-14GA';
UPDATE public.products SET price = 2.82, price_contractor = 2.45 WHERE sku = 'TUBE-2.5-14GA';
UPDATE public.products SET price = 2.50, price_contractor = 2.85 WHERE sku = 'TUBE-2.25-12GA';

-- Tape
UPDATE public.products SET price = 18.40, price_contractor = 16.00 WHERE sku = 'TAPE-DBL';

-- Trim & Components
UPDATE public.products SET price = 20.24, price_contractor = 16.60 WHERE sku = 'TRIM-BOX-EVE';
UPDATE public.products SET price = 20.24, price_contractor = 16.60 WHERE sku = 'TRIM-CORNER';
UPDATE public.products SET price = 25.88, price_contractor = 22.50 WHERE sku = 'TRIM-FLASHING';
UPDATE public.products SET price =  8.63, price_contractor =  6.50 WHERE sku = 'TRIM-J';
UPDATE public.products SET price =  8.63, price_contractor =  6.50 WHERE sku = 'TRIM-L';
UPDATE public.products SET price = 20.24, price_contractor = 16.60 WHERE sku = 'TRIM-SIDE-VERT';
UPDATE public.products SET price =  0.98, price_contractor =  0.85 WHERE sku = 'HAT-CHANNEL';
UPDATE public.products SET price = 109.25, price_contractor =  95.00 WHERE sku = 'FOAM-STRIP';
UPDATE public.products SET price =   0.50, price_contractor =   0.45 WHERE sku = 'L-BRACKET';
UPDATE public.products SET price = 20.24, price_contractor =  16.60 WHERE sku = 'RIDGE-CAP';

-- Windows
UPDATE public.products SET price = 103.50, price_contractor =  90.00 WHERE sku = 'WIN-24X36';
UPDATE public.products SET price = 138.00, price_contractor = 120.00 WHERE sku = 'WIN-36X36';

-- ===================================================================
-- 3. INSERT NEW PRODUCTS FROM PRODUCTS CSV
-- ===================================================================
INSERT INTO public.products (sku, name, category_id, description, unit, weight_lbs, price, price_contractor, stock_qty, active) VALUES
  -- Scrap tubing
  ('TUBE-2.0-14GA-SCRAP',  '2.0" 14GA Square Tubing Scrap',  (SELECT id FROM public.product_categories WHERE slug='square-tubing'), '2.00" 14 GA Scrap Square Tube',  'Foot', 1.895, 1.96, 1.70, 0, true),
  ('TUBE-2.25-14GA-SCRAP', '2.25" 14GA Square Tubing Scrap', (SELECT id FROM public.product_categories WHERE slug='square-tubing'), '2.25" 14 GA Scrap Square Tube',  'Foot', 2.135, 2.19, 1.90, 0, true),
  ('TUBE-2.5-14GA-SCRAP',  '2.5" 14GA Square Tubing Scrap',  (SELECT id FROM public.product_categories WHERE slug='square-tubing'), '2.5" 14GA Scrap Square Tube',    'Foot', 2.4,   2.30, 2.00, 0, true),
  ('TUBE-2.25-12GA-SCRAP', '2.25" 12GA Square Tubing Scrap', (SELECT id FROM public.product_categories WHERE slug='square-tubing'), '2.25" 12 GA Scrap Square Tube',  'Foot', 3.0,   2.42, 2.10, 0, true),
  -- Panels
  ('SKYLIGHT-12FT', '12'' Skylight',             (SELECT id FROM public.product_categories WHERE slug='panels'), 'White Plastic 12'' Skylight', 'Each', null,  121.10, 105.30, 0, true),
  ('PANEL-STONE',   '29 GA Sheet Metal Stone',   (SELECT id FROM public.product_categories WHERE slug='panels'), '29 GA Sheet Metal Stone Sheets', 'Foot', 1.975, 5.18, 4.50, 0, true),
  -- Anchors
  ('MHA-BOLTS', 'MHA Bolts', (SELECT id FROM public.product_categories WHERE slug='anchors'), 'Mobile Home Anchor Bolts', 'Each', null, 1.95, 1.50, 0, true),
  -- Inserts
  ('INS-1FT-2X2', '1'' 2x2 14GA Insert', (SELECT id FROM public.product_categories WHERE slug='inserts-fasteners'), '1 Foot 2x2 14GA Insert', 'Each', 1.0, 2.24, 1.95, 0, true),
  -- Doors
  ('WALKIN-HW',      'Walk-in Door Hardware',   (SELECT id FROM public.product_categories WHERE slug='doors-hardware'), 'Walk-in Door Hardware Set', 'Each', 15,   57.50, 50.00, 0, true),
  ('WALKIN-DOOR-HD', 'Heavy Duty Walk-in Door', (SELECT id FROM public.product_categories WHERE slug='doors-hardware'), 'Heavy Duty Walk-in Door',   'Each', null, 920.00, 800.00, 0, true),
  -- Windows
  ('WIN-30X30', '30" x 30" Window', (SELECT id FROM public.product_categories WHERE slug='windows'), '30" x 30" Window', 'Each', null, 103.50, 90.00, 0, true),
  -- Screws (additional)
  ('SCREWS-BOX-W-PAINTED', 'Box of 1½" Painted Screws w/ Washers', (SELECT id FROM public.product_categories WHERE slug='screws'), 'Box of 1½" Painted Screws with Washers', 'Each', null, 281.75, 245.00, 0, true),
  ('SCREWS-BAG-W-PAINTED', 'Bag of 1½" Painted Screws w/ Washers', (SELECT id FROM public.product_categories WHERE slug='screws'), 'Bag of 1½" Painted Screws with Washers', 'Each', null,  97.90,  85.13, 0, true),
  ('SCREWS-BOX-125',       'Box of Screws (125 ct)',                (SELECT id FROM public.product_categories WHERE slug='screws'), 'Box of Screws with Washers', 'Each', 5.0, 143.75, 125.00, 0, true),
  ('SCREWS-BAG-250',       'Bag of Screws & Washers (250 ct)',      (SELECT id FROM public.product_categories WHERE slug='screws'), '250 Screws with Washers', 'Each', null, 40.25, 35.00, 0, true),
  ('SCREWS-STITCH-BAG',    'Bag of Stitch Screws',                  (SELECT id FROM public.product_categories WHERE slug='screws'), 'Bag of Stitch Screws', 'Each', null, 51.75, 45.00, 0, true)
ON CONFLICT (sku) DO UPDATE SET
  price            = EXCLUDED.price,
  price_contractor = EXCLUDED.price_contractor,
  active           = EXCLUDED.active;

-- ===================================================================
-- 4. ADD DOOR PRODUCT CATEGORIES
-- ===================================================================
INSERT INTO public.product_categories (name, slug) VALUES
  ('Acero Garage Doors',      'acero-doors'),
  ('Model 2000 Garage Doors', 'model-2000-doors'),
  ('Model 2500 Garage Doors', 'model-2500-doors'),
  ('Model 3100 Garage Doors', 'model-3100-doors'),
  ('650 Mini Garage Doors',   'mini-650-doors')
ON CONFLICT (slug) DO NOTHING;

-- ===================================================================
-- 5. ACERO DOORS
-- ===================================================================
INSERT INTO public.products (sku, name, category_id, description, unit, price, price_contractor, stock_qty, active) VALUES
  ('ACERO-6X6',   'Acero 6''x6'' Door',   (SELECT id FROM public.product_categories WHERE slug='acero-doors'), 'Acero 6''x6'' Garage Door',   'Each',  719.82,  625.93, 0, true),
  ('ACERO-8X8',   'Acero 8''x8'' Door',   (SELECT id FROM public.product_categories WHERE slug='acero-doors'), 'Acero 8''x8'' Garage Door',   'Each',  893.04,  776.56, 0, true),
  ('ACERO-9X8',   'Acero 9''x8'' Door',   (SELECT id FROM public.product_categories WHERE slug='acero-doors'), 'Acero 9''x8'' Garage Door',   'Each',  912.67,  793.63, 0, true),
  ('ACERO-10X8',  'Acero 10''x8'' Door',  (SELECT id FROM public.product_categories WHERE slug='acero-doors'), 'Acero 10''x8'' Garage Door',  'Each',  968.61,  842.27, 0, true),
  ('ACERO-10X10', 'Acero 10''x10'' Door', (SELECT id FROM public.product_categories WHERE slug='acero-doors'), 'Acero 10''x10'' Garage Door', 'Each', 1088.23,  946.29, 0, true),
  ('ACERO-12X12', 'Acero 12''x12'' Door', (SELECT id FROM public.product_categories WHERE slug='acero-doors'), 'Acero 12''x12'' Garage Door', 'Each', 2307.73, 2006.72, 0, true),
  ('ACERO-12X14', 'Acero 12''x14'' Door', (SELECT id FROM public.product_categories WHERE slug='acero-doors'), 'Acero 12''x14'' Garage Door', 'Each', 2575.89, 2239.90, 0, true),
  ('ACERO-14X14', 'Acero 14''x14'' Door', (SELECT id FROM public.product_categories WHERE slug='acero-doors'), 'Acero 14''x14'' Garage Door', 'Each', 3244.06, 2820.92, 0, true)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, price_contractor = EXCLUDED.price_contractor;

-- ===================================================================
-- 6. MODEL 2000 DOORS
-- ===================================================================
INSERT INTO public.products (sku, name, category_id, description, unit, price, price_contractor, stock_qty, active) VALUES
  -- Reduced Drive Chain Hoist
  ('M2000RD-8X12',  'Model 2000 RD 8''x12''',  (SELECT id FROM public.product_categories WHERE slug='model-2000-doors'), 'Model 2000 Reduced Drive 8''x12''',  'Each', 1581.43, 1171.43, 0, true),
  ('M2000RD-8X14',  'Model 2000 RD 8''x14''',  (SELECT id FROM public.product_categories WHERE slug='model-2000-doors'), 'Model 2000 Reduced Drive 8''x14''',  'Each', 1744.13, 1291.95, 0, true),
  ('M2000RD-8X16',  'Model 2000 RD 8''x16''',  (SELECT id FROM public.product_categories WHERE slug='model-2000-doors'), 'Model 2000 Reduced Drive 8''x16''',  'Each', 1951.20, 1445.33, 0, true),
  ('M2000RD-9X12',  'Model 2000 RD 9''x12''',  (SELECT id FROM public.product_categories WHERE slug='model-2000-doors'), 'Model 2000 Reduced Drive 9''x12''',  'Each', 1719.48, 1273.69, 0, true),
  ('M2000RD-9X14',  'Model 2000 RD 9''x14''',  (SELECT id FROM public.product_categories WHERE slug='model-2000-doors'), 'Model 2000 Reduced Drive 9''x14''',  'Each', 1823.01, 1350.38, 0, true),
  ('M2000RD-9X16',  'Model 2000 RD 9''x16''',  (SELECT id FROM public.product_categories WHERE slug='model-2000-doors'), 'Model 2000 Reduced Drive 9''x16''',  'Each', 2069.52, 1532.98, 0, true),
  ('M2000RD-10X12', 'Model 2000 RD 10''x12''', (SELECT id FROM public.product_categories WHERE slug='model-2000-doors'), 'Model 2000 Reduced Drive 10''x12''', 'Each', 1837.81, 1361.34, 0, true),
  ('M2000RD-10X14', 'Model 2000 RD 10''x14''', (SELECT id FROM public.product_categories WHERE slug='model-2000-doors'), 'Model 2000 Reduced Drive 10''x14''', 'Each', 1990.64, 1474.55, 0, true),
  ('M2000RD-10X16', 'Model 2000 RD 10''x16''', (SELECT id FROM public.product_categories WHERE slug='model-2000-doors'), 'Model 2000 Reduced Drive 10''x16''', 'Each', 2375.19, 1759.40, 0, true),
  ('M2000RD-12X8',  'Model 2000 RD 12''x8''',  (SELECT id FROM public.product_categories WHERE slug='model-2000-doors'), 'Model 2000 Reduced Drive 12''x8''',  'Each', 1581.43, 1171.43, 0, true),
  ('M2000RD-12X9',  'Model 2000 RD 12''x9''',  (SELECT id FROM public.product_categories WHERE slug='model-2000-doors'), 'Model 2000 Reduced Drive 12''x9''',  'Each', 1620.88, 1200.65, 0, true),
  ('M2000RD-12X10', 'Model 2000 RD 12''x10''', (SELECT id FROM public.product_categories WHERE slug='model-2000-doors'), 'Model 2000 Reduced Drive 12''x10''', 'Each', 1758.92, 1302.90, 0, true),
  ('M2000RD-12X12', 'Model 2000 RD 12''x12''', (SELECT id FROM public.product_categories WHERE slug='model-2000-doors'), 'Model 2000 Reduced Drive 12''x12''', 'Each', 1985.72, 1470.90, 0, true),
  ('M2000RD-12X14', 'Model 2000 RD 12''x14''', (SELECT id FROM public.product_categories WHERE slug='model-2000-doors'), 'Model 2000 Reduced Drive 12''x14''', 'Each', 2217.43, 1642.54, 0, true),
  ('M2000RD-12X16', 'Model 2000 RD 12''x16''', (SELECT id FROM public.product_categories WHERE slug='model-2000-doors'), 'Model 2000 Reduced Drive 12''x16''', 'Each', 2631.57, 1949.31, 0, true),
  -- Hand Operated
  ('M2000HO-8X8',   'Model 2000 HO 8''x8''',   (SELECT id FROM public.product_categories WHERE slug='model-2000-doors'), 'Model 2000 Hand Operated 8''x8''',   'Each', 1042.16,  771.97, 0, true),
  ('M2000HO-8X9',   'Model 2000 HO 8''x9''',   (SELECT id FROM public.product_categories WHERE slug='model-2000-doors'), 'Model 2000 Hand Operated 8''x9''',   'Each', 1101.32,  815.79, 0, true),
  ('M2000HO-8X10',  'Model 2000 HO 8''x10''',  (SELECT id FROM public.product_categories WHERE slug='model-2000-doors'), 'Model 2000 Hand Operated 8''x10''',  'Each', 1160.49,  859.62, 0, true),
  ('M2000HO-9X8',   'Model 2000 HO 9''x8''',   (SELECT id FROM public.product_categories WHERE slug='model-2000-doors'), 'Model 2000 Hand Operated 9''x8''',   'Each', 1135.84,  841.36, 0, true),
  ('M2000HO-9X9',   'Model 2000 HO 9''x9''',   (SELECT id FROM public.product_categories WHERE slug='model-2000-doors'), 'Model 2000 Hand Operated 9''x9''',   'Each', 1194.99,  885.18, 0, true),
  ('M2000HO-9X10',  'Model 2000 HO 9''x10''',  (SELECT id FROM public.product_categories WHERE slug='model-2000-doors'), 'Model 2000 Hand Operated 9''x10''',  'Each', 1264.02,  936.31, 0, true),
  ('M2000HO-10X8',  'Model 2000 HO 10''x8''',  (SELECT id FROM public.product_categories WHERE slug='model-2000-doors'), 'Model 2000 Hand Operated 10''x8''',  'Each', 1175.27,  870.57, 0, true),
  ('M2000HO-10X9',  'Model 2000 HO 10''x9''',  (SELECT id FROM public.product_categories WHERE slug='model-2000-doors'), 'Model 2000 Hand Operated 10''x9''',  'Each', 1249.22,  925.35, 0, true),
  ('M2000HO-10X10', 'Model 2000 HO 10''x10''', (SELECT id FROM public.product_categories WHERE slug='model-2000-doors'), 'Model 2000 Hand Operated 10''x10''', 'Each', 1367.55, 1013.00, 0, true)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, price_contractor = EXCLUDED.price_contractor;

-- ===================================================================
-- 7. MODEL 2500 DOORS
-- ===================================================================
INSERT INTO public.products (sku, name, category_id, description, unit, price, price_contractor, stock_qty, active) VALUES
  -- Reduced Drive Chain Hoist
  ('M2500RD-8X12',  'Model 2500 RD 8''x12''',  (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Reduced Drive 8''x12''',  'Each', 2069.52, 1532.98, 0, true),
  ('M2500RD-8X14',  'Model 2500 RD 8''x14''',  (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Reduced Drive 8''x14''',  'Each', 2313.56, 1713.75, 0, true),
  ('M2500RD-8X16',  'Model 2500 RD 8''x16''',  (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Reduced Drive 8''x16''',  'Each', 2601.99, 1927.40, 0, true),
  ('M2500RD-8X18',  'Model 2500 RD 8''x18''',  (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Reduced Drive 8''x18''',  'Each', 2858.36, 2117.30, 0, true),
  ('M2500RD-9X12',  'Model 2500 RD 9''x12''',  (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Reduced Drive 9''x12''',  'Each', 2207.57, 1635.24, 0, true),
  ('M2500RD-9X14',  'Model 2500 RD 9''x14''',  (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Reduced Drive 9''x14''',  'Each', 2392.46, 1772.19, 0, true),
  ('M2500RD-9X16',  'Model 2500 RD 9''x16''',  (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Reduced Drive 9''x16''',  'Each', 2720.30, 2015.04, 0, true),
  ('M2500RD-9X18',  'Model 2500 RD 9''x18''',  (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Reduced Drive 9''x18''',  'Each', 2991.47, 2215.90, 0, true),
  ('M2500RD-10X12', 'Model 2500 RD 10''x12''', (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Reduced Drive 10''x12''', 'Each', 2325.89, 1722.88, 0, true),
  ('M2500RD-10X14', 'Model 2500 RD 10''x14''', (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Reduced Drive 10''x14''', 'Each', 2560.07, 1896.35, 0, true),
  ('M2500RD-10X16', 'Model 2500 RD 10''x16''', (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Reduced Drive 10''x16''', 'Each', 3025.98, 2241.47, 0, true),
  ('M2500RD-10X18', 'Model 2500 RD 10''x18''', (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Reduced Drive 10''x18''', 'Each', 3329.19, 2466.07, 0, true),
  ('M2500RD-12X8',  'Model 2500 RD 12''x8''',  (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Reduced Drive 12''x8''',  'Each', 1906.82, 1412.46, 0, true),
  ('M2500RD-12X9',  'Model 2500 RD 12''x9''',  (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Reduced Drive 12''x9''',  'Each', 1986.94, 1471.81, 0, true),
  ('M2500RD-12X10', 'Model 2500 RD 12''x10''', (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Reduced Drive 12''x10''', 'Each', 2165.66, 1604.19, 0, true),
  ('M2500RD-12X12', 'Model 2500 RD 12''x12''', (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Reduced Drive 12''x12''', 'Each', 2473.79, 1832.44, 0, true),
  ('M2500RD-12X14', 'Model 2500 RD 12''x14''', (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Reduced Drive 12''x14''', 'Each', 2786.87, 2064.35, 0, true),
  ('M2500RD-12X16', 'Model 2500 RD 12''x16''', (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Reduced Drive 12''x16''', 'Each', 3035.84, 2248.77, 0, true),
  ('M2500RD-12X18', 'Model 2500 RD 12''x18''', (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Reduced Drive 12''x18''', 'Each', 3339.05, 2473.37, 0, true),
  ('M2500RD-14X8',  'Model 2500 RD 14''x8''',  (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Reduced Drive 14''x8''',  'Each', 1970.92, 1459.94, 0, true),
  ('M2500RD-14X9',  'Model 2500 RD 14''x9''',  (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Reduced Drive 14''x9''',  'Each', 2173.05, 1609.67, 0, true),
  ('M2500RD-14X10', 'Model 2500 RD 14''x10''', (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Reduced Drive 14''x10''', 'Each', 2370.26, 1755.75, 0, true),
  ('M2500RD-14X12', 'Model 2500 RD 14''x12''', (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Reduced Drive 14''x12''', 'Each', 2715.38, 2011.39, 0, true),
  ('M2500RD-14X14', 'Model 2500 RD 14''x14''', (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Reduced Drive 14''x14''', 'Each', 2956.96, 2190.34, 0, true),
  ('M2500RD-14X16', 'Model 2500 RD 14''x16''', (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Reduced Drive 14''x16''', 'Each', 3292.22, 2438.68, 0, true),
  ('M2500RD-14X18', 'Model 2500 RD 14''x18''', (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Reduced Drive 14''x18''', 'Each', 3617.61, 2679.71, 0, true),
  ('M2500RD-16X8',  'Model 2500 RD 16''x8''',  (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Reduced Drive 16''x8''',  'Each', 2118.83, 1569.50, 0, true),
  ('M2500RD-16X9',  'Model 2500 RD 16''x9''',  (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Reduced Drive 16''x9''',  'Each', 2355.48, 1744.80, 0, true),
  ('M2500RD-16X10', 'Model 2500 RD 16''x10''', (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Reduced Drive 16''x10''', 'Each', 2601.99, 1927.40, 0, true),
  ('M2500RD-16X12', 'Model 2500 RD 16''x12''', (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Reduced Drive 16''x12''', 'Each', 2892.86, 2142.86, 0, true),
  ('M2500RD-16X14', 'Model 2500 RD 16''x14''', (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Reduced Drive 16''x14''', 'Each', 3178.82, 2354.68, 0, true),
  ('M2500RD-16X16', 'Model 2500 RD 16''x16''', (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Reduced Drive 16''x16''', 'Each', 3494.35, 2588.41, 0, true),
  ('M2500RD-16X18', 'Model 2500 RD 16''x18''', (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Reduced Drive 16''x18''', 'Each', 3819.74, 2829.44, 0, true),
  ('M2500RD-18X8',  'Model 2500 RD 18''x8''',  (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Reduced Drive 18''x8''',  'Each', 2182.92, 1616.98, 0, true),
  ('M2500RD-18X9',  'Model 2500 RD 18''x9''',  (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Reduced Drive 18''x9''',  'Each', 2552.69, 1890.88, 0, true),
  ('M2500RD-18X10', 'Model 2500 RD 18''x10''', (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Reduced Drive 18''x10''', 'Each', 2833.70, 2099.04, 0, true),
  ('M2500RD-18X12', 'Model 2500 RD 18''x12''', (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Reduced Drive 18''x12''', 'Each', 3070.36, 2274.34, 0, true),
  ('M2500RD-18X14', 'Model 2500 RD 18''x14''', (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Reduced Drive 18''x14''', 'Each', 3405.60, 2522.67, 0, true),
  ('M2500RD-18X16', 'Model 2500 RD 18''x16''', (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Reduced Drive 18''x16''', 'Each', 3716.21, 2752.75, 0, true),
  ('M2500RD-18X18', 'Model 2500 RD 18''x18''', (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Reduced Drive 18''x18''', 'Each', 4016.95, 2975.52, 0, true),
  -- Hand Operated
  ('M2500HO-8X8',   'Model 2500 HO 8''x8''',   (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Hand Operated 8''x8''',   'Each', 1367.55, 1013.00, 0, true),
  ('M2500HO-8X9',   'Model 2500 HO 8''x9''',   (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Hand Operated 8''x9''',   'Each', 1466.28, 1086.13, 0, true),
  ('M2500HO-8X10',  'Model 2500 HO 8''x10''',  (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Hand Operated 8''x10''',  'Each', 1540.50, 1141.11, 0, true),
  ('M2500HO-9X8',   'Model 2500 HO 9''x8''',   (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Hand Operated 9''x8''',   'Each', 1461.23, 1082.39, 0, true),
  ('M2500HO-9X9',   'Model 2500 HO 9''x9''',   (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Hand Operated 9''x9''',   'Each', 1561.06, 1156.34, 0, true),
  ('M2500HO-9X10',  'Model 2500 HO 9''x10''',  (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Hand Operated 9''x10''',  'Each', 1774.29, 1314.29, 0, true),
  ('M2500HO-10X8',  'Model 2500 HO 10''x8''',  (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Hand Operated 10''x8''',  'Each', 1500.66, 1111.60, 0, true),
  ('M2500HO-10X9',  'Model 2500 HO 10''x9''',  (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Hand Operated 10''x9''',  'Each', 1615.29, 1196.51, 0, true),
  ('M2500HO-10X10', 'Model 2500 HO 10''x10''', (SELECT id FROM public.product_categories WHERE slug='model-2500-doors'), 'Model 2500 Hand Operated 10''x10''', 'Each', 1774.29, 1314.29, 0, true)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, price_contractor = EXCLUDED.price_contractor;

-- ===================================================================
-- 8. MODEL 3100 DOORS (Reduced Drive only)
-- ===================================================================
INSERT INTO public.products (sku, name, category_id, description, unit, price, price_contractor, stock_qty, active) VALUES
  ('M3100RD-8X8',   'Model 3100 RD 8''x8''',   (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 8''x8''',   'Each', 2127.78, 1576.13, 0, true),
  ('M3100RD-8X9',   'Model 3100 RD 8''x9''',   (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 8''x9''',   'Each', 2287.66, 1694.56, 0, true),
  ('M3100RD-8X10',  'Model 3100 RD 8''x10''',  (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 8''x10''',  'Each', 2398.45, 1776.63, 0, true),
  ('M3100RD-8X12',  'Model 3100 RD 8''x12''',  (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 8''x12''',  'Each', 2779.47, 2058.87, 0, true),
  ('M3100RD-8X14',  'Model 3100 RD 8''x14''',  (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 8''x14''',  'Each', 3123.85, 2313.96, 0, true),
  ('M3100RD-8X16',  'Model 3100 RD 8''x16''',  (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 8''x16''',  'Each', 3345.22, 2477.94, 0, true),
  ('M3100RD-8X18',  'Model 3100 RD 8''x18''',  (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 8''x18''',  'Each', 3566.70, 2642.00, 0, true),
  ('M3100RD-9X8',   'Model 3100 RD 9''x8''',   (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 9''x8''',   'Each', 2263.13, 1676.39, 0, true),
  ('M3100RD-9X9',   'Model 3100 RD 9''x9''',   (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 9''x9''',   'Each', 2361.47, 1749.24, 0, true),
  ('M3100RD-9X10',  'Model 3100 RD 9''x10''',  (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 9''x10''',  'Each', 2545.99, 1885.92, 0, true),
  ('M3100RD-9X12',  'Model 3100 RD 9''x12''',  (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 9''x12''',  'Each', 3000.85, 2222.85, 0, true),
  ('M3100RD-9X14',  'Model 3100 RD 9''x14''',  (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 9''x14''',  'Each', 3271.51, 2423.34, 0, true),
  ('M3100RD-9X16',  'Model 3100 RD 9''x16''',  (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 9''x16''',  'Each', 3566.70, 2642.00, 0, true),
  ('M3100RD-9X18',  'Model 3100 RD 9''x18''',  (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 9''x18''',  'Each', 3861.90, 2860.67, 0, true),
  ('M3100RD-10X8',  'Model 3100 RD 10''x8''',  (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 10''x8''',  'Each', 2349.15, 1740.11, 0, true),
  ('M3100RD-10X9',  'Model 3100 RD 10''x9''',  (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 10''x9''',  'Each', 2496.83, 1849.50, 0, true),
  ('M3100RD-10X10', 'Model 3100 RD 10''x10''', (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 10''x10''', 'Each', 2644.47, 1958.87, 0, true),
  ('M3100RD-10X12', 'Model 3100 RD 10''x12''', (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 10''x12''', 'Each', 3099.20, 2295.70, 0, true),
  ('M3100RD-10X14', 'Model 3100 RD 10''x14''', (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 10''x14''', 'Each', 3419.05, 2532.63, 0, true),
  ('M3100RD-10X16', 'Model 3100 RD 10''x16''', (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 10''x16''', 'Each', 3689.71, 2733.12, 0, true),
  ('M3100RD-10X18', 'Model 3100 RD 10''x18''', (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 10''x18''', 'Each', 3960.25, 2933.52, 0, true),
  ('M3100RD-12X8',  'Model 3100 RD 12''x8''',  (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 12''x8''',  'Each', 2631.83, 1949.50, 0, true),
  ('M3100RD-12X9',  'Model 3100 RD 12''x9''',  (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 12''x9''',  'Each', 2791.68, 2067.91, 0, true),
  ('M3100RD-12X10', 'Model 3100 RD 12''x10''', (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 12''x10''', 'Each', 2951.65, 2186.41, 0, true),
  ('M3100RD-12X12', 'Model 3100 RD 12''x12''', (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 12''x12''', 'Each', 3296.03, 2441.50, 0, true),
  ('M3100RD-12X14', 'Model 3100 RD 12''x14''', (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 12''x14''', 'Each', 3665.06, 2714.86, 0, true),
  ('M3100RD-12X16', 'Model 3100 RD 12''x16''', (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 12''x16''', 'Each', 4255.58, 3152.28, 0, true),
  ('M3100RD-12X18', 'Model 3100 RD 12''x18''', (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 12''x18''', 'Each', 4353.93, 3225.13, 0, true),
  ('M3100RD-14X8',  'Model 3100 RD 14''x8''',  (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 14''x8''',  'Each', 2828.66, 2095.30, 0, true),
  ('M3100RD-14X9',  'Model 3100 RD 14''x9''',  (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 14''x9''',  'Each', 3025.50, 2241.11, 0, true),
  ('M3100RD-14X10', 'Model 3100 RD 14''x10''', (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 14''x10''', 'Each', 3222.21, 2386.82, 0, true),
  ('M3100RD-14X12', 'Model 3100 RD 14''x12''', (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 14''x12''', 'Each', 3566.70, 2642.00, 0, true),
  ('M3100RD-14X14', 'Model 3100 RD 14''x14''', (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 14''x14''', 'Each', 4009.55, 2970.04, 0, true),
  ('M3100RD-14X16', 'Model 3100 RD 14''x16''', (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 14''x16''', 'Each', 4304.76, 3188.71, 0, true),
  ('M3100RD-14X18', 'Model 3100 RD 14''x18''', (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 14''x18''', 'Each', 4599.95, 3407.37, 0, true),
  ('M3100RD-16X8',  'Model 3100 RD 16''x8''',  (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 16''x8''',  'Each', 3074.68, 2277.54, 0, true),
  ('M3100RD-16X9',  'Model 3100 RD 16''x9''',  (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 16''x9''',  'Each', 3271.51, 2423.34, 0, true),
  ('M3100RD-16X10', 'Model 3100 RD 16''x10''', (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 16''x10''', 'Each', 3468.22, 2569.05, 0, true),
  ('M3100RD-16X12', 'Model 3100 RD 16''x12''', (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 16''x12''', 'Each', 3911.07, 2897.09, 0, true),
  ('M3100RD-16X14', 'Model 3100 RD 16''x14''', (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 16''x14''', 'Each', 4378.58, 3243.39, 0, true),
  ('M3100RD-16X16', 'Model 3100 RD 16''x16''', (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 16''x16''', 'Each', 4722.95, 3498.48, 0, true),
  ('M3100RD-18X8',  'Model 3100 RD 18''x8''',  (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 18''x8''',  'Each', 3320.68, 2459.76, 0, true),
  ('M3100RD-18X9',  'Model 3100 RD 18''x9''',  (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 18''x9''',  'Each', 3517.52, 2605.57, 0, true),
  ('M3100RD-18X10', 'Model 3100 RD 18''x10''', (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 18''x10''', 'Each', 3714.24, 2751.29, 0, true),
  ('M3100RD-18X12', 'Model 3100 RD 18''x12''', (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 18''x12''', 'Each', 4206.28, 3115.76, 0, true),
  ('M3100RD-18X14', 'Model 3100 RD 18''x14''', (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 18''x14''', 'Each', 4575.30, 3389.11, 0, true),
  ('M3100RD-20X8',  'Model 3100 RD 20''x8''',  (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 20''x8''',  'Each', 3763.54, 2787.81, 0, true),
  ('M3100RD-20X9',  'Model 3100 RD 20''x9''',  (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 20''x9''',  'Each', 4009.55, 2970.04, 0, true),
  ('M3100RD-20X10', 'Model 3100 RD 20''x10''', (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 20''x10''', 'Each', 4255.58, 3152.28, 0, true),
  ('M3100RD-20X12', 'Model 3100 RD 20''x12''', (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 20''x12''', 'Each', 4747.60, 3516.74, 0, true),
  ('M3100RD-20X14', 'Model 3100 RD 20''x14''', (SELECT id FROM public.product_categories WHERE slug='model-3100-doors'), 'Model 3100 Reduced Drive 20''x14''', 'Each', 5313.34, 3935.81, 0, true)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, price_contractor = EXCLUDED.price_contractor;

-- ===================================================================
-- 9. 650 MINI DOORS
--    SKU format: MINI650-{width_ft}X{height_encoded}
--    Height encoding: 68=6'8", 70=7'0", 74=7'4", 80=8', 90=9', 100=10'
-- ===================================================================
INSERT INTO public.products (sku, name, category_id, description, unit, price, price_contractor, stock_qty, active) VALUES
  ('MINI650-6X68',  '650 Mini 6''x6''8"',   (SELECT id FROM public.product_categories WHERE slug='mini-650-doors'), '650 Mini Door 6''x6''8"',   'Each',  625.00,  462.96, 0, true),
  ('MINI650-6X70',  '650 Mini 6''x7''',     (SELECT id FROM public.product_categories WHERE slug='mini-650-doors'), '650 Mini Door 6''x7''',     'Each',  647.82,  479.87, 0, true),
  ('MINI650-6X74',  '650 Mini 6''x7''4"',   (SELECT id FROM public.product_categories WHERE slug='mini-650-doors'), '650 Mini Door 6''x7''4"',   'Each',  672.75,  498.33, 0, true),
  ('MINI650-6X80',  '650 Mini 6''x8''',     (SELECT id FROM public.product_categories WHERE slug='mini-650-doors'), '650 Mini Door 6''x8''',     'Each',  703.89,  521.40, 0, true),
  ('MINI650-7X68',  '650 Mini 7''x6''8"',   (SELECT id FROM public.product_categories WHERE slug='mini-650-doors'), '650 Mini Door 7''x6''8"',   'Each',  668.60,  495.26, 0, true),
  ('MINI650-7X70',  '650 Mini 7''x7''',     (SELECT id FROM public.product_categories WHERE slug='mini-650-doors'), '650 Mini Door 7''x7''',     'Each',  697.67,  516.79, 0, true),
  ('MINI650-7X74',  '650 Mini 7''x7''4"',   (SELECT id FROM public.product_categories WHERE slug='mini-650-doors'), '650 Mini Door 7''x7''4"',   'Each',  726.73,  538.32, 0, true),
  ('MINI650-7X80',  '650 Mini 7''x8''',     (SELECT id FROM public.product_categories WHERE slug='mini-650-doors'), '650 Mini Door 7''x8''',     'Each',  757.89,  561.40, 0, true),
  ('MINI650-8X68',  '650 Mini 8''x6''8"',   (SELECT id FROM public.product_categories WHERE slug='mini-650-doors'), '650 Mini Door 8''x6''8"',   'Each',  730.89,  541.40, 0, true),
  ('MINI650-8X70',  '650 Mini 8''x7''',     (SELECT id FROM public.product_categories WHERE slug='mini-650-doors'), '650 Mini Door 8''x7''',     'Each',  763.01,  565.19, 0, true),
  ('MINI650-8X74',  '650 Mini 8''x7''4"',   (SELECT id FROM public.product_categories WHERE slug='mini-650-doors'), '650 Mini Door 8''x7''4"',   'Each',  801.48,  593.69, 0, true),
  ('MINI650-8X80',  '650 Mini 8''x8''',     (SELECT id FROM public.product_categories WHERE slug='mini-650-doors'), '650 Mini Door 8''x8''',     'Each',  834.71,  618.30, 0, true),
  ('MINI650-8X90',  '650 Mini 8''x9''',     (SELECT id FROM public.product_categories WHERE slug='mini-650-doors'), '650 Mini Door 8''x9''',     'Each',  940.59,  696.73, 0, true),
  ('MINI650-88X68', '650 Mini 8''8"x6''8"', (SELECT id FROM public.product_categories WHERE slug='mini-650-doors'), '650 Mini Door 8''8"x6''8"', 'Each',  768.26,  569.08, 0, true),
  ('MINI650-88X70', '650 Mini 8''8"x7''',   (SELECT id FROM public.product_categories WHERE slug='mini-650-doors'), '650 Mini Door 8''8"x7''',   'Each',  773.08,  572.65, 0, true),
  ('MINI650-88X74', '650 Mini 8''8"x7''4"', (SELECT id FROM public.product_categories WHERE slug='mini-650-doors'), '650 Mini Door 8''8"x7''4"', 'Each',  816.01,  604.45, 0, true),
  ('MINI650-88X80', '650 Mini 8''8"x8''',   (SELECT id FROM public.product_categories WHERE slug='mini-650-doors'), '650 Mini Door 8''8"x8''',   'Each',  851.19,  630.51, 0, true),
  ('MINI650-88X90', '650 Mini 8''8"x9''',   (SELECT id FROM public.product_categories WHERE slug='mini-650-doors'), '650 Mini Door 8''8"x9''',   'Each',  950.97,  704.42, 0, true),
  ('MINI650-9X68',  '650 Mini 9''x6''8"',   (SELECT id FROM public.product_categories WHERE slug='mini-650-doors'), '650 Mini Door 9''x6''8"',   'Each',  797.32,  590.61, 0, true),
  ('MINI650-9X70',  '650 Mini 9''x7''',     (SELECT id FROM public.product_categories WHERE slug='mini-650-doors'), '650 Mini Door 9''x7''',     'Each',  809.78,  599.84, 0, true),
  ('MINI650-9X74',  '650 Mini 9''x7''4"',   (SELECT id FROM public.product_categories WHERE slug='mini-650-doors'), '650 Mini Door 9''x7''4"',   'Each',  867.93,  642.91, 0, true),
  ('MINI650-9X80',  '650 Mini 9''x8''',     (SELECT id FROM public.product_categories WHERE slug='mini-650-doors'), '650 Mini Door 9''x8''',     'Each',  890.76,  659.82, 0, true),
  ('MINI650-9X90',  '650 Mini 9''x9''',     (SELECT id FROM public.product_categories WHERE slug='mini-650-doors'), '650 Mini Door 9''x9''',     'Each',  975.89,  722.88, 0, true),
  ('MINI650-9X100', '650 Mini 9''x10''',    (SELECT id FROM public.product_categories WHERE slug='mini-650-doors'), '650 Mini Door 9''x10''',    'Each', 1075.55,  796.70, 0, true),
  ('MINI650-10X70', '650 Mini 10''x7''',    (SELECT id FROM public.product_categories WHERE slug='mini-650-doors'), '650 Mini Door 10''x7''',    'Each',  903.22,  669.05, 0, true),
  ('MINI650-10X80', '650 Mini 10''x8''',    (SELECT id FROM public.product_categories WHERE slug='mini-650-doors'), '650 Mini Door 10''x8''',    'Each',  953.05,  705.96, 0, true),
  ('MINI650-10X90', '650 Mini 10''x9''',    (SELECT id FROM public.product_categories WHERE slug='mini-650-doors'), '650 Mini Door 10''x9''',    'Each', 1056.86,  782.86, 0, true),
  ('MINI650-10X100','650 Mini 10''x10''',   (SELECT id FROM public.product_categories WHERE slug='mini-650-doors'), '650 Mini Door 10''x10''',   'Each', 1162.76,  861.30, 0, true)
ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, price_contractor = EXCLUDED.price_contractor;
