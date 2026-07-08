-- Migration 029: Re-categorize the catalog into the storefront navigation buckets
-- ============================================================================
-- Collapses the ~19 granular product categories into the seven customer-facing
-- buckets the storefront navigates by (see src/lib/nav-categories.ts):
--
--   Panels · Trim · Tubing · Doors & Windows · Components · Fasteners · Bracing
--
-- Products are re-homed by their current category, with per-SKU exceptions where
-- the old "Trim & Components" category splits across Trim / Components / Bracing.
-- Idempotent: category inserts use ON CONFLICT; the UPDATEs are keyed on the
-- destination-independent source slugs, and old empty categories are pruned only
-- when nothing references them.
--
-- NOTE: Trusses and Base Rail are already soft-deleted (migration 015, active =
-- false). We deliberately do NOT re-home their inactive SKUs, so those two legacy
-- categories remain (hidden from customers — every storefront query filters on
-- active = true) while every other legacy category is pruned.

-- ── 1. Ensure the destination categories exist ─────────────────────────────
-- 'panels' already exists (seed 002) and is reused as-is.
insert into public.product_categories (name, slug) values
  ('Trim',            'trim'),
  ('Tubing',          'tubing'),
  ('Doors & Windows', 'doors-windows'),
  ('Components',      'components'),
  ('Fasteners',       'fasteners'),
  ('Bracing',         'bracing')
on conflict (slug) do nothing;

-- Helper: resolve a category id by slug (used throughout).
-- (Inlined as subqueries below — no function created, to keep the migration
--  self-contained and safe to re-run.)

-- ── 2. Re-home products by source category ─────────────────────────────────

-- Tubing  ← Square Tubing + Inserts (inserts are short square-tube nipples)
update public.products
set category_id = (select id from public.product_categories where slug = 'tubing')
where category_id in (
  select id from public.product_categories where slug in ('square-tubing', 'inserts-fasteners')
);

-- Bracing ← Braces
update public.products
set category_id = (select id from public.product_categories where slug = 'bracing')
where category_id = (select id from public.product_categories where slug = 'braces');

-- Fasteners ← Screws + Anchors + Rebar (rebar is treated as an anchor)
update public.products
set category_id = (select id from public.product_categories where slug = 'fasteners')
where category_id in (
  select id from public.product_categories where slug in ('screws', 'anchors', 'rebar')
);

-- Doors & Windows ← Doors & Hardware + Windows + every garage-door model line
update public.products
set category_id = (select id from public.product_categories where slug = 'doors-windows')
where category_id in (
  select id from public.product_categories where slug in (
    'doors-hardware', 'windows',
    'acero-doors', 'model-2000-doors', 'model-2500-doors', 'model-3100-doors', 'mini-650-doors'
  )
);

-- Panels  ← Foam closure strips (die-cut to the panel profile, sold with panels)
update public.products
set category_id = (select id from public.product_categories where slug = 'panels')
where category_id = (select id from public.product_categories where slug = 'foam');

-- Components ← Bundles + Moisture Barrier + Tape + Welding
update public.products
set category_id = (select id from public.product_categories where slug = 'components')
where category_id in (
  select id from public.product_categories where slug in (
    'bundles', 'moisture-barrier', 'tape', 'welding'
  )
);

-- Trim ← everything currently in "Trim & Components" ...
update public.products
set category_id = (select id from public.product_categories where slug = 'trim')
where category_id = (select id from public.product_categories where slug = 'trim-components');

-- ... then redistribute the non-trim members of that old category:
--   hat channel + L-bracket are structural accessories → Components
update public.products
set category_id = (select id from public.product_categories where slug = 'components')
where sku in ('HAT-CHANNEL', 'L-BRACKET');
--   the legacy combined foam closure strip joins the panel section
update public.products
set category_id = (select id from public.product_categories where slug = 'panels')
where sku = 'FOAM-STRIP';

-- ── 3. Product cleanup & labeling ──────────────────────────────────────────
-- Asphalt anchors are also sold as "rock" anchors; reflect both names on the one
-- product (it stays a standalone card — concrete and mobile-home anchors are the
-- ones grouped with a size/option dropdown, see VARIANT_GROUPS).
update public.products
set name = 'Asphalt / Rock Anchors'
where sku = 'ASPHALT-ANCHOR';

-- Retire stray screw SKUs so Fasteners shows just the two screw products (with /
-- without washers, each with box/bag + colored options). Soft-delete (active =
-- false) to preserve order history:
--   SCREWS-COLOR      — legacy $0 price-modifier, superseded by the color picker
--   SCREWS-BAG-250    — duplicates SCREWS-BAG-W (250 ct washered bag)
--   SCREWS-STITCH-BAG — stitch screws, not sold online
update public.products
set active = false
where sku in ('SCREWS-COLOR', 'SCREWS-BAG-250', 'SCREWS-STITCH-BAG');

-- The washered painted screws are the storefront "Colored Screws" product
-- (its own card with a Box/Bag package dropdown, see VARIANT_GROUPS). Say
-- "Colored" instead of "Painted" everywhere they surface.
update public.products
set name        = replace(name, 'Painted', 'Colored'),
    description = replace(description, 'Painted', 'Colored')
where sku in ('SCREWS-BOX-W-PAINTED', 'SCREWS-BAG-W-PAINTED');

-- ── 4. Prune emptied legacy categories ─────────────────────────────────────
-- Deletes only categories that no product (active or otherwise) still points at,
-- so base-rail and trusses (which retain their inactive SKUs) survive, and the
-- reused 'panels' bucket is untouched.
delete from public.product_categories
where slug in (
  'square-tubing', 'braces', 'screws', 'inserts-fasteners', 'anchors',
  'doors-hardware', 'windows',
  'acero-doors', 'model-2000-doors', 'model-2500-doors', 'model-3100-doors', 'mini-650-doors',
  'bundles', 'foam', 'moisture-barrier', 'rebar', 'tape', 'welding', 'trim-components'
)
and id not in (select category_id from public.products where category_id is not null);
