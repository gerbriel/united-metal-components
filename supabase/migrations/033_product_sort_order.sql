-- Migration 033: Manual display order for products
-- ============================================================================
-- Adds products.sort_order so admins can arrange the order items appear within
-- their category — mirrors product_categories.sort_order and the up/down
-- reordering in the Categories manager. The dashboard inventory list orders by
-- (category sort_order, product sort_order, name).
--
-- Seeded to preserve today's display: products are numbered per category in
-- their current alphabetical (name) order. New products default to 0 and sort
-- to the top of their category until an admin arranges them.

alter table public.products
  add column if not exists sort_order int not null default 0;

-- Seed the initial order per category to match the current name-sorted display.
with ranked as (
  select id,
         row_number() over (partition by category_id order by name) - 1 as rn
  from public.products
)
update public.products p
set sort_order = ranked.rn
from ranked
where ranked.id = p.id;

create index if not exists products_category_sort_idx
  on public.products (category_id, sort_order);
