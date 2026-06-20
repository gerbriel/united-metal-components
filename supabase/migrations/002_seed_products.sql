-- ── Seed product categories ───────────────────────────────────
insert into public.product_categories (name, slug) values
  ('Anchors',           'anchors'),
  ('Base Rail',         'base-rail'),
  ('Braces',            'braces'),
  ('Bundles',           'bundles'),
  ('Doors & Hardware',  'doors-hardware'),
  ('Foam',              'foam'),
  ('Inserts & Fasteners','inserts-fasteners'),
  ('Insulation',        'insulation'),
  ('Panels',            'panels'),
  ('Rebar',             'rebar'),
  ('Screws',            'screws'),
  ('Square Tubing',     'square-tubing'),
  ('Tape',              'tape'),
  ('Trim & Components', 'trim-components'),
  ('Trusses',           'trusses'),
  ('Welding',           'welding'),
  ('Windows',           'windows');

-- ── Seed products ─────────────────────────────────────────────
insert into public.products (sku, name, category_id, description, unit, weight_lbs, price, stock_qty) values
  -- Anchors
  ('ASPHALT-ANCHOR',   'Asphalt Anchors',          (select id from product_categories where slug='anchors'), 'Asphalt Anchors', 'Foot', 4.2,   10.00,  50),
  ('CONC-5-SHORT',     '5" Short Concrete Anchors', (select id from product_categories where slug='anchors'), '5" Short Concrete Anchors', 'Each', 0.2,  1.00, 200),
  ('CONC-7-LONG',      '7" Long Concrete Anchors',  (select id from product_categories where slug='anchors'), '7" Long Concrete Anchors',  'Each', 0.5,  1.00, 200),
  ('MHA',              'Mobile Home Anchors',        (select id from product_categories where slug='anchors'), 'Mobile Home Anchors', 'Each', 3.4,  10.00,  50),
  -- Base Rail
  ('BASE-5FT',  '5'' Base Rail',  (select id from product_categories where slug='base-rail'), '5'' length extension',  null, null, 20.50, 30),
  ('BASE-10FT', '10'' Base Rail', (select id from product_categories where slug='base-rail'), '10'' length extension', null, null, 41.00, 30),
  ('BASE-20FT', '20'' Base Rail', (select id from product_categories where slug='base-rail'), '20'' length extension', null, null, 90.00, 20),
  -- Braces
  ('BRACE',    'Braces', (select id from product_categories where slug='braces'), 'Braces', 'Foot', 0.805, 1.00, 500),
  -- Bundles
  ('BUNDLE-PKG', 'Bundle Package', (select id from product_categories where slug='bundles'), '24 L Brackets + Anchors', 'Bundle', null, 720.00, 10),
  -- Doors & Hardware
  ('DOOR-HW',       'Door Hardware',     (select id from product_categories where slug='doors-hardware'), 'Garage Door Hardware', 'Each', 15,  50.00, 20),
  ('WALKIN-KNOB',   'Walk-in Door Knob', (select id from product_categories where slug='doors-hardware'), 'Walk-in-Door Knob',    'Each', 0,   40.00, 15),
  ('WALKIN-DOOR',   'Walk-in Door',      (select id from product_categories where slug='doors-hardware'), '36" x 80"',            'Each', 35, 220.00,  8),
  ('GARAGE-6X6',   '6''x6'' Garage Door',  (select id from product_categories where slug='doors-hardware'), '6'' x 6'' Garage Door',  'Each', 94,  478.12, 5),
  ('GARAGE-8X8',   '8''x8'' Garage Door',  (select id from product_categories where slug='doors-hardware'), '8'' x 8'' Garage Door',  'Each', 130, 615.05, 5),
  ('GARAGE-9X8',   '9''x8'' Garage Door',  (select id from product_categories where slug='doors-hardware'), '9'' x 8'' Garage Door',  'Each', 136, 630.57, 5),
  ('GARAGE-10X8',  '10''x8'' Garage Door', (select id from product_categories where slug='doors-hardware'), '10'' x 8'' Garage Door', 'Each', 153, 674.79, 5),
  ('GARAGE-10X10', '10''x10'' Garage Door',(select id from product_categories where slug='doors-hardware'), '10'' x 10'' Garage Door','Each', 178, 769.35, 5),
  ('GARAGE-12X12', '12''x12'' Garage Door',(select id from product_categories where slug='doors-hardware'), '12'' x 12'' Garage Door','Each', 300,1642.47, 3),
  ('GARAGE-12X14', '12''x14'' Garage Door',(select id from product_categories where slug='doors-hardware'), '12'' x 14'' Garage Door','Each', 350,1854.45, 3),
  ('GARAGE-14X14', '14''x14'' Garage Door',(select id from product_categories where slug='doors-hardware'), '14'' x 14'' Garage Door','Each', 400,2382.65, 3),
  -- Foam
  ('FOAM-ENC',  'Foam Enclosure',       (select id from product_categories where slug='foam'), 'Foam Enclosure', 'Foot', null, 1.50, 200),
  -- Inserts & Fasteners
  ('INS-7-2X2', '7" 2x2 14GA Insert',  (select id from product_categories where slug='inserts-fasteners'), '7" 2x2 14GA Insert',  'Each', 2.135, 2.00, 100),
  ('INS-7-14GA','7" 14GA Insert',       (select id from product_categories where slug='inserts-fasteners'), '7" 14GA Insert',       'Each', 1.0,   2.30, 100),
  ('INS-1FT',   '1'' 14GA Insert Nipo', (select id from product_categories where slug='inserts-fasteners'), '1 Foot 14GA Insert Nipo', 'Each', 2.5, 2.00, 100),
  -- Insulation
  ('INS-4FT-ROLL',   '4'' Roll Of Insulation',      (select id from product_categories where slug='insulation'), 'Roll Of Insulation 4'' x 125''', 'Each', 0.05, 185.00, 20),
  ('INS-6FT-ROLL',   '6'' Roll Of Insulation',      (select id from product_categories where slug='insulation'), 'Roll Of Insulation 6'' x 125''', 'Each', 0.05, 221.00, 20),
  ('INS-4FT-BUBBLE', '4'' Bubble Wrap Insulation',  (select id from product_categories where slug='insulation'), 'Double Bubble Wrap Insulation 4''', 'Each', null, 170.00, 20),
  -- Panels
  ('PANEL-29GA',       '29 GA Sheet Metal',       (select id from product_categories where slug='panels'), '29 Gauge Painted Sheet Metal',       'Foot', 1.975, 2.30, 500),
  ('PANEL-29GA-SCRAP', '29 GA Sheet Metal Scrap', (select id from product_categories where slug='panels'), '29 Gauge Painted Sheet Metal-Scrap', 'Foot', 1.975, 2.00, 100),
  ('PANEL-GALVALUME',  'Galvalume Sheets',         (select id from product_categories where slug='panels'), '29 Gauge Sheet Metal Galvalume',     'Each', 1.975, 2.40, 300),
  -- Rebar
  ('REBAR', 'Rebar', (select id from product_categories where slug='rebar'), 'Rebar', 'Each', 3.0, 4.50, 200),
  -- Screws
  ('SCREWS-BOX-W',  'Box of Screws w/ Washers',  (select id from product_categories where slug='screws'), '3000 pcs, Washers Included',     'Each', 29,   135.00, 30),
  ('SCREWS-BOX-WO', 'Box of Screws w/o Washers', (select id from product_categories where slug='screws'), '3000 pcs, Washers Not Included', 'Each', 29,   200.00, 30),
  ('SCREWS-BAG-W',  'Bag of Screws w/ Washers',  (select id from product_categories where slug='screws'), '250 pcs, Washers Included',      'Each', null,  35.00, 50),
  ('SCREWS-BAG-WO', 'Bag of Screws w/o Washers', (select id from product_categories where slug='screws'), '250 pcs, Washers Not Included',  'Each', null,  40.00, 50),
  ('SCREWS-COLOR',  'Color Screws',               (select id from product_categories where slug='screws'), '5% of price on roof/sides/ends — varies by building', null, null, 0.00, 0),
  -- Square Tubing
  ('TUBE-2.5-14GA',  '2.5" 14 GA Square Tubing',  (select id from product_categories where slug='square-tubing'), '2.5" 14 GA Square Tube',  'Foot', 2.4,   2.55, 300),
  ('TUBE-2.25-14GA', '2.25" 14 GA Square Tubing', (select id from product_categories where slug='square-tubing'), '2.25" 14 GA Square Tube', 'Foot', 2.135, 2.50, 300),
  ('TUBE-2.0-14GA',  '2.0" 14 GA Square Tubing',  (select id from product_categories where slug='square-tubing'), '2.0" 14 GA Square Tube',  'Foot', 1.895, 3.00, 300),
  ('TUBE-2.25-12GA', '2.25" 12 GA Square Tubing', (select id from product_categories where slug='square-tubing'), '2.25" 12 GA Square Tube', 'Foot', 3.0,   2.40, 300),
  -- Tape
  ('TAPE-DBL', 'Double Coated Tape', (select id from product_categories where slug='tape'), 'Double Coated Polyethylene Tape', 'Each', 1.0, 25.00, 40),
  -- Trim & Components
  ('TRIM-BOX-EVE',  'Box Eve Trim',           (select id from product_categories where slug='trim-components'), 'Box Eve Trim',           'Each', 6.85, 18.00, 50),
  ('TRIM-CORNER',   'Corner Trim',            (select id from product_categories where slug='trim-components'), 'Corner Trim',            'Each', 8.06, 18.00, 50),
  ('TRIM-FLASHING', 'Flashing Trim',          (select id from product_categories where slug='trim-components'), 'Flashing Trim',          'Each', 20,   20.00, 50),
  ('TRIM-J',        'J-Trim',                 (select id from product_categories where slug='trim-components'), 'J-Trim',                 'Each', 2.91,  7.00, 100),
  ('TRIM-L',        'L-Trim',                 (select id from product_categories where slug='trim-components'), 'L-Trim',                 'Each', 3.85, 10.00, 100),
  ('TRIM-SIDE-VERT','Side Vertical Trim',     (select id from product_categories where slug='trim-components'), 'Side Vertical Trim',     'Each', 6.85, 20.00, 50),
  ('HAT-CHANNEL',   'Hat Channels',           (select id from product_categories where slug='trim-components'), 'Hat Channels',           'Each', 8.05,  1.00, 100),
  ('FOAM-STRIP',    'Inner/Outer Foam Strips',(select id from product_categories where slug='trim-components'), 'Inner/Outer Foam Strips','Each', 1.0, 100.00, 30),
  ('L-BRACKET',     'L-Bracket',              (select id from product_categories where slug='trim-components'), 'L-Bracket',              'Each', 0.1,   0.80, 500),
  ('RIDGE-CAP',     'Ridge Cap',              (select id from product_categories where slug='trim-components'), 'Ridge Cap',              'Each', 8.2,  20.00, 50),
  -- Trusses
  ('TRUSS-18-20', '18''-20'' Trusses', (select id from product_categories where slug='trusses'), '18''-20'' Trusses', null, null, 100.00, 20),
  ('TRUSS-22-24', '22''-24'' Trusses', (select id from product_categories where slug='trusses'), '22''-24'' Trusses', null, null, 150.00, 20),
  ('TRUSS-26-28', '26''-28'' Trusses', (select id from product_categories where slug='trusses'), '26''-28'' Trusses', null, null, 230.00, 15),
  ('TRUSS-30',    '30'' Trusses',      (select id from product_categories where slug='trusses'), '30'' Trusses',      null, null, 300.00, 10),
  ('TRUSS-BEND',  'Truss Bending',     (select id from product_categories where slug='trusses'), 'Vertical or Horizontal Bending', 'Each', null, 15.00, 999),
  -- Welding
  ('WELD-NIPPLE', 'Welding Nipples', (select id from product_categories where slug='welding'), 'Welding Nipples', 'Each', null, 8.00, 50),
  -- Windows
  ('WIN-24X36', '24" x 36" Window', (select id from product_categories where slug='windows'), '24" x 36" Window', 'Each', 10,   85.00, 10),
  ('WIN-36X36', '36" x 36" Window', (select id from product_categories where slug='windows'), '36" x 36" Window', 'Each', null,100.00, 10);
