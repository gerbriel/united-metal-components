-- Migration 030: admin-managed, DB-driven category navigation
-- ============================================================================
-- Adds presentation columns to product_categories so the storefront nav (header
-- category bar, homepage cards, footer, and the /products sidebar) is driven
-- entirely from the database and managed from the dashboard — no code edits or
-- redeploys to add/rename/reorder/hide a category. Realtime is enabled on
-- product_categories and products so open storefront pages update on save.
--
-- Staff already have write access (001: product_categories "... for all using
-- is_staff()"), so no new RLS policies are required.

-- ── 1. Presentation columns ────────────────────────────────────────────────
alter table public.product_categories
  add column if not exists sort_order  int     not null default 0,
  add column if not exists icon        text,        -- lucide icon name (mapped in src/lib/nav-categories.ts)
  add column if not exists description text,         -- blurb shown on nav / home cards
  add column if not exists nav_visible boolean not null default true;  -- show in storefront nav?

-- ── 2. Seed presentation for the seven storefront buckets ──────────────────
-- Matches the previously hardcoded NAV_CATEGORIES so nothing shifts on first
-- deploy. Icons are lucide component names.
update public.product_categories set sort_order = 0, icon = 'Layers',    description = '29 GA painted, galvalume & overstock'      where slug = 'panels';
update public.product_categories set sort_order = 1, icon = 'Frame',     description = 'Eve, corner, J/L, ridge cap & flashing'    where slug = 'trim';
update public.product_categories set sort_order = 2, icon = 'Box',       description = '12 & 14 GA square tubing'                  where slug = 'tubing';
update public.product_categories set sort_order = 3, icon = 'DoorOpen',  description = 'Garage, walk-in doors & windows'           where slug = 'doors-windows';
update public.product_categories set sort_order = 4, icon = 'Component', description = 'Hat channel, foam, moisture barrier & more' where slug = 'components';
update public.product_categories set sort_order = 5, icon = 'Bolt',      description = 'Screws, inserts & anchors'                 where slug = 'fasteners';
update public.product_categories set sort_order = 6, icon = 'Grid2x2',   description = 'Structural cross braces'                   where slug = 'bracing';

-- Hide any non-bucket legacy categories (e.g. base-rail, trusses) from the nav
-- and sort them last; admins can re-show them from the dashboard if wanted.
update public.product_categories
set nav_visible = false, sort_order = 999
where slug not in ('panels', 'trim', 'tubing', 'doors-windows', 'components', 'fasteners', 'bracing');

-- ── 3. Enable realtime ─────────────────────────────────────────────────────
do $$ begin
  alter publication supabase_realtime add table public.product_categories;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.products;
exception when duplicate_object then null; end $$;
