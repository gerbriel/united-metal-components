-- ============================================================
-- United Metal Components — Full Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ── Profiles (extends auth.users) ────────────────────────────
create type public.user_role as enum ('customer', 'employee', 'admin');

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        public.user_role not null default 'customer',
  full_name   text,
  phone       text,
  company     text,
  address     text,
  city        text,
  state       text,
  zip         text,
  notes       text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Product Categories ────────────────────────────────────────
create table public.product_categories (
  id    serial primary key,
  name  text not null unique,
  slug  text not null unique
);

-- ── Products ──────────────────────────────────────────────────
create table public.products (
  id            serial primary key,
  sku           text unique,
  name          text not null,
  category_id   int references public.product_categories(id),
  description   text,
  unit          text,
  weight_lbs    numeric(10,3),
  price         numeric(10,2) not null,
  stock_qty     int not null default 0,
  image_url     text,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── Orders ───────────────────────────────────────────────────
create type public.order_status as enum (
  'pending', 'confirmed', 'processing', 'ready', 'completed', 'cancelled'
);

create table public.orders (
  id              bigserial primary key,
  customer_id     uuid not null references public.profiles(id),
  status          public.order_status not null default 'pending',
  subtotal        numeric(10,2) not null default 0,
  tax             numeric(10,2) not null default 0,
  total           numeric(10,2) not null default 0,
  shipping_name   text,
  shipping_phone  text,
  shipping_addr   text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.order_items (
  id          bigserial primary key,
  order_id    bigint not null references public.orders(id) on delete cascade,
  product_id  int not null references public.products(id),
  quantity    numeric(10,2) not null,
  unit_price  numeric(10,2) not null,
  total_price numeric(10,2) not null
);

create table public.order_status_history (
  id          bigserial primary key,
  order_id    bigint not null references public.orders(id) on delete cascade,
  old_status  public.order_status,
  new_status  public.order_status not null,
  changed_by  uuid references public.profiles(id),
  notes       text,
  created_at  timestamptz not null default now()
);

-- ── Notifications ─────────────────────────────────────────────
create type public.notification_type as enum ('order_update', 'newsletter', 'system');

create table public.notifications (
  id          bigserial primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        public.notification_type not null default 'system',
  title       text not null,
  message     text not null,
  order_id    bigint references public.orders(id) on delete set null,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ── Inventory Log ─────────────────────────────────────────────
create table public.inventory_log (
  id            bigserial primary key,
  product_id    int not null references public.products(id),
  change_qty    int not null,
  reason        text,
  changed_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now()
);

-- ── Newsletter ────────────────────────────────────────────────
create type public.subscriber_status as enum ('active', 'unsubscribed');

create table public.newsletter_subscribers (
  id              bigserial primary key,
  email           text not null unique,
  name            text,
  status          public.subscriber_status not null default 'active',
  subscribed_at   timestamptz not null default now(),
  unsubscribed_at timestamptz
);

create type public.campaign_status as enum ('draft', 'scheduled', 'sent');

create table public.newsletter_campaigns (
  id            bigserial primary key,
  subject       text not null,
  preview_text  text,
  body_html     text not null,
  body_text     text,
  status        public.campaign_status not null default 'draft',
  scheduled_at  timestamptz,
  sent_at       timestamptz,
  created_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now()
);

-- ── CRM Notes ─────────────────────────────────────────────────
create table public.crm_notes (
  id          bigserial primary key,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  author_id   uuid references public.profiles(id),
  body        text not null,
  created_at  timestamptz not null default now()
);

-- ── Social Posts ──────────────────────────────────────────────
create type public.post_status as enum ('draft', 'scheduled', 'published', 'failed');

create table public.social_posts (
  id            bigserial primary key,
  content       text not null,
  image_url     text,
  platforms     text[] not null default '{}',
  status        public.post_status not null default 'draft',
  scheduled_at  timestamptz,
  published_at  timestamptz,
  created_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now()
);

-- ── Analytics Events ──────────────────────────────────────────
create table public.analytics_events (
  id          bigserial primary key,
  session_id  text,
  event       text not null default 'pageview',
  page        text not null,
  referrer    text,
  country     text,
  device      text,
  created_at  timestamptz not null default now()
);

-- ── RLS Policies ──────────────────────────────────────────────
alter table public.profiles              enable row level security;
alter table public.products              enable row level security;
alter table public.product_categories    enable row level security;
alter table public.orders                enable row level security;
alter table public.order_items           enable row level security;
alter table public.order_status_history  enable row level security;
alter table public.notifications         enable row level security;
alter table public.inventory_log         enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.newsletter_campaigns  enable row level security;
alter table public.crm_notes             enable row level security;
alter table public.social_posts          enable row level security;
alter table public.analytics_events      enable row level security;

-- Helper: check if current user is employee or admin
create or replace function public.is_staff()
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('employee','admin')
  );
$$;

-- Profiles
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);
create policy "Staff can view all profiles"
  on public.profiles for select using (public.is_staff());
create policy "Staff can update all profiles"
  on public.profiles for update using (public.is_staff());

-- Products (public read, staff write)
create policy "Anyone can view active products"
  on public.products for select using (active = true or public.is_staff());
create policy "Staff can manage products"
  on public.products for all using (public.is_staff());

create policy "Anyone can view categories"
  on public.product_categories for select using (true);
create policy "Staff can manage categories"
  on public.product_categories for all using (public.is_staff());

-- Orders
create policy "Customers see own orders"
  on public.orders for select using (auth.uid() = customer_id);
create policy "Customers create own orders"
  on public.orders for insert with check (auth.uid() = customer_id);
create policy "Staff see all orders"
  on public.orders for select using (public.is_staff());
create policy "Staff update orders"
  on public.orders for update using (public.is_staff());

create policy "Customers see own order items"
  on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()));
create policy "Customers insert own order items"
  on public.order_items for insert
  with check (exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()));
create policy "Staff see all order items"
  on public.order_items for select using (public.is_staff());

create policy "Status history visible to order owner and staff"
  on public.order_status_history for select
  using (
    public.is_staff() or
    exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid())
  );
create policy "Staff insert status history"
  on public.order_status_history for insert with check (public.is_staff());

-- Notifications
create policy "Users see own notifications"
  on public.notifications for select using (auth.uid() = user_id);
create policy "Users update own notifications"
  on public.notifications for update using (auth.uid() = user_id);
create policy "Staff insert notifications"
  on public.notifications for insert with check (public.is_staff());

-- Inventory
create policy "Staff manage inventory log"
  on public.inventory_log for all using (public.is_staff());

-- Newsletter
create policy "Anyone can subscribe"
  on public.newsletter_subscribers for insert with check (true);
create policy "Staff manage subscribers"
  on public.newsletter_subscribers for all using (public.is_staff());

create policy "Staff manage campaigns"
  on public.newsletter_campaigns for all using (public.is_staff());

-- CRM notes
create policy "Staff manage CRM notes"
  on public.crm_notes for all using (public.is_staff());

-- Social posts
create policy "Staff manage social posts"
  on public.social_posts for all using (public.is_staff());

-- Analytics (insert for anyone, read for staff)
create policy "Anyone can insert analytics"
  on public.analytics_events for insert with check (true);
create policy "Staff can view analytics"
  on public.analytics_events for select using (public.is_staff());
