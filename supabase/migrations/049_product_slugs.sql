-- SEO-friendly product URLs: a stable, unique slug per product, used by
-- /products/[slug]. Derived from the product name. Legacy numeric URLs
-- (/products/67) 308-redirect to the slug in the app layer.

alter table public.products add column if not exists slug text;

-- Fill a blank slug from the name, keeping it unique and STABLE — once set it is
-- never rewritten (renaming a product must not churn its URL). Runs before every
-- insert/update so any insert path (admin form, seeds, imports) gets a slug.
create or replace function public.products_set_slug()
returns trigger language plpgsql as $$
declare
  base      text;
  candidate text;
begin
  if new.slug is not null and new.slug <> '' then
    return new;
  end if;
  base := nullif(trim(both '-' from regexp_replace(lower(coalesce(new.name, '')), '[^a-z0-9]+', '-', 'g')), '');
  base := coalesce(base, 'product');
  candidate := base;
  -- Disambiguate a collision with the row id (unique); random guard if no id yet.
  if exists (select 1 from public.products where slug = candidate and id is distinct from new.id) then
    candidate := base || '-' || coalesce(new.id::text, floor(random() * 1000000)::text);
  end if;
  new.slug := candidate;
  return new;
end $$;

drop trigger if exists trg_products_set_slug on public.products;
create trigger trg_products_set_slug
  before insert or update on public.products
  for each row execute function public.products_set_slug();

-- Backfill existing rows: name-based, disambiguated by id only where a name is
-- shared by more than one product.
with base as (
  select id,
         nullif(trim(both '-' from regexp_replace(lower(coalesce(name, '')), '[^a-z0-9]+', '-', 'g')), '') as b
  from public.products
), ranked as (
  select id, coalesce(b, 'product') as b,
         count(*) over (partition by coalesce(b, 'product')) as cnt
  from base
)
update public.products p
set slug = case when r.cnt > 1 then r.b || '-' || p.id else r.b end
from ranked r
where r.id = p.id and (p.slug is null or p.slug = '');

create unique index if not exists products_slug_key on public.products (slug);
