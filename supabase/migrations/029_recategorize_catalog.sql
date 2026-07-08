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

-- Tubing  ← Square Tubing
update public.products
set category_id = (select id from public.product_categories where slug = 'tubing')
where category_id = (select id from public.product_categories where slug = 'square-tubing');

-- Bracing ← Braces
update public.products
set category_id = (select id from public.product_categories where slug = 'bracing')
where category_id = (select id from public.product_categories where slug = 'braces');

-- Fasteners ← Screws + Inserts & Fasteners + Anchors
update public.products
set category_id = (select id from public.product_categories where slug = 'fasteners')
where category_id in (
  select id from public.product_categories where slug in ('screws', 'inserts-fasteners', 'anchors')
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

-- Components ← Bundles + Foam + Moisture Barrier + Rebar + Tape + Welding
update public.products
set category_id = (select id from public.product_categories where slug = 'components')
where category_id in (
  select id from public.product_categories where slug in (
    'bundles', 'foam', 'moisture-barrier', 'rebar', 'tape', 'welding'
  )
);

-- Trim ← everything currently in "Trim & Components" ...
update public.products
set category_id = (select id from public.product_categories where slug = 'trim')
where category_id = (select id from public.product_categories where slug = 'trim-components');

-- ... then pull the non-trim members of that old category into Components.
-- (Hat channel, L-bracket, and the legacy combined foam strip are structural /
--  accessory items, not trim.)
update public.products
set category_id = (select id from public.product_categories where slug = 'components')
where sku in ('HAT-CHANNEL', 'L-BRACKET', 'FOAM-STRIP');

-- ── 3. Prune emptied legacy categories ─────────────────────────────────────
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
