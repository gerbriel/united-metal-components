-- ============================================================
-- Migration 055: Promote the color palette to a DB table (`finishes`)
-- ============================================================
-- Colors/finishes lived only as a hardcoded constant (src/lib/product-config.ts
-- COLORS, 16 entries) referenced everywhere by NAME string. This promotes them
-- to a staff-editable table so we can (a) let admins add/edit/reorder/deactivate
-- finishes, and (b) hang an explicit FINISH CLASS on each — the thing that drives
-- per-color pricing:
--
--   galvalume → bare metal (no paint). Cheapest. Was once its own SKU
--               (PANEL-GALVALUME $2.59 vs PANEL-29GA $3.10) before migration 022
--               folded it into a color choice and dropped the price distinction.
--   solid     → standard painted coil. The base/default price.
--   pattern   → printed/roll-formed artwork (Dark Stone, Light Rock). Premium.
--
-- Finish class is a property of the COLOR/COIL, so anything cut from that coil
-- (panel OR trim) inherits it. The printed-vs-metallic distinction previously
-- only existed as runtime substring guessing in product3d/geom.ts
-- (isMetallicFinish, TEXTURE_BY_NAME); `finish_class` replaces that with data.
--
-- Free-text color columns (order_items.item_color, product_coils.color,
-- purchase_order_items.color, panel_overstock.color, carts.items JSONB) are NOT
-- dropped — migration 056 adds finish_id FKs ALONGSIDE them and backfills, so
-- historical/legacy strings stay intact.

CREATE TABLE IF NOT EXISTS public.finishes (
  id           BIGSERIAL PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE,                 -- display name, e.g. 'Galvalume', 'Dark Stone'
  slug         TEXT NOT NULL UNIQUE,                 -- stable key, e.g. 'galvalume', 'dark-stone'
  hex          TEXT NOT NULL,                        -- swatch color + 3D fallback
  text_dark    BOOLEAN NOT NULL DEFAULT true,        -- dark label text reads on this swatch
  gradient     TEXT,                                 -- swatch-only sheen (metallic finishes)
  texture      TEXT,                                 -- printed-pattern image path (public/-relative)
  finish_class TEXT NOT NULL DEFAULT 'solid'
    CHECK (finish_class IN ('galvalume', 'solid', 'pattern')),
  active       BOOLEAN NOT NULL DEFAULT true,        -- inactive = hidden from pickers, keeps labeling data
  sort         INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS finishes_active_sort_idx ON public.finishes (active, sort);

-- ── Seed from the current COLORS constant (product-config.ts:22-40) ───────────
-- Order/sort preserves the existing palette order. finish_class: Galvalume =
-- galvalume; Light Rock + Dark Stone = pattern; the other 13 = solid.
INSERT INTO public.finishes (name, slug, hex, text_dark, gradient, texture, finish_class, sort) VALUES
  ('White',         'white',         '#F0F0EA', true,  NULL, NULL, 'solid',      10),
  ('Light Stone',   'light-stone',   '#CFC6AF', true,  NULL, NULL, 'solid',      20),
  ('Pebble Beige',  'pebble-beige',  '#D0BE97', true,  NULL, NULL, 'solid',      30),
  ('Mocha Tan',     'mocha-tan',     '#A5825A', true,  NULL, NULL, 'solid',      40),
  ('Taupe',         'taupe',         '#877564', true,  NULL, NULL, 'solid',      50),
  ('Clay',          'clay',          '#A96C46', true,  NULL, NULL, 'solid',      60),
  ('Brown',         'brown',         '#4A3223', false, NULL, NULL, 'solid',      70),
  ('Zinc Gray',     'zinc-gray',     '#6C7176', false, NULL, NULL, 'solid',      80),
  ('Pewter Gray',   'pewter-gray',   '#93938D', true,  NULL, NULL, 'solid',      90),
  ('Galvalume',     'galvalume',     '#C6C8C5', true,
    'linear-gradient(135deg, #E2E4E0 0%, #BFC2BE 42%, #D6D8D4 52%, #AEB1AD 100%)', NULL, 'galvalume', 100),
  ('Hawaiian Blue', 'hawaiian-blue', '#3670C0', false, NULL, NULL, 'solid',     110),
  ('Forest Green',  'forest-green',  '#2C4E27', false, NULL, NULL, 'solid',     120),
  ('Barn Red',      'barn-red',      '#7C2A24', false, NULL, NULL, 'solid',     130),
  ('Black',         'black',         '#1C1C1C', false, NULL, NULL, 'solid',     140),
  ('Light Rock',    'light-rock',    '#9E9384', true,  NULL, '/textures/light-rock.jpg', 'pattern', 150),
  ('Dark Stone',    'dark-stone',    '#4E453E', false, NULL, '/textures/dark-stone.jpg', 'pattern', 160)
ON CONFLICT (name) DO NOTHING;

-- ── RLS: public reads active finishes (storefront pickers); admins manage ─────
-- Names/hex/finish_class are not sensitive; PRICES are never here (they live in
-- product_tier_prices / product_finish_prices, staff-only). Office employees do
-- not write finishes directly — they propose changes through the inventory
-- approval queue (migration 053 / 058) and an admin applies them.
ALTER TABLE public.finishes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone reads active finishes" ON public.finishes;
CREATE POLICY "Anyone reads active finishes"
  ON public.finishes FOR SELECT USING (active OR public.is_staff());

DROP POLICY IF EXISTS "Admins manage finishes" ON public.finishes;
CREATE POLICY "Admins manage finishes"
  ON public.finishes FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Live-update the dashboard finishes manager, like product_coils / panel_overstock.
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.finishes;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public.finishes REPLICA IDENTITY FULL;
