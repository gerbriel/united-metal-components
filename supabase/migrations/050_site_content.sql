-- Admin-editable site content: business hours (+ holiday hours), and the
-- Privacy Policy / Terms of Service documents. One jsonb key/value store.

create table if not exists public.site_content (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_content enable row level security;

-- Public read (hours + policies are shown on the storefront); admins write.
drop policy if exists "Anyone reads site content" on public.site_content;
create policy "Anyone reads site content" on public.site_content
  for select using (true);

drop policy if exists "Admins write site content" on public.site_content;
create policy "Admins write site content" on public.site_content
  for all using (public.is_admin()) with check (public.is_admin());

-- Seed defaults. Privacy/Terms start empty — the public pages fall back to their
-- current built-in content until an admin saves an override, so nothing is lost.
insert into public.site_content (key, value) values
  ('business_hours', '{"rows":[{"label":"Mon – Fri","hours":"7am – 5pm"},{"label":"Sat","hours":"8am – 12pm"},{"label":"Sun","hours":"Closed"}],"holidays":[]}'::jsonb),
  ('privacy_policy', '{"html":""}'::jsonb),
  ('terms_of_service', '{"html":""}'::jsonb)
on conflict (key) do nothing;
