-- ── Announcements & promotions ───────────────────────────────
-- Staff/admin-authored promotions shown to storefront visitors in one of five
-- formats (a slim bar, an image hero banner, a center modal, a corner card, or a
-- sticky bottom bar). Each promotion is scheduled (start/end), page-targeted,
-- audience-scoped, UTM-tagged, and measured (impressions / clicks / dismisses).
--
-- Reuses the existing conventions: public.is_admin() gates writes (mirrors
-- pricing_tiers, 041); anon visitors read only live rows; a public storage bucket
-- holds promo images (mirrors receiving-docs, 048, but public); event logging is
-- anon-insertable (mirrors analytics_events, 001/003).

-- ── 1. Announcements ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.announcements (
  id            bigserial PRIMARY KEY,
  format        text NOT NULL DEFAULT 'bar'
                  CHECK (format IN ('bar', 'hero', 'modal', 'corner', 'bottom')),
  title         text,                                     -- headline (all formats)
  body          text,                                     -- supporting line (hero/modal/corner/bottom)
  image_path    text,                                     -- path in the 'announcements' storage bucket
  cta_label     text,                                     -- button / link text
  cta_url       text,                                     -- where the button links (UTM appended at render)
  bg_style      text NOT NULL DEFAULT 'navy'
                  CHECK (bg_style IN ('navy', 'orange', 'green', 'red', 'dark')),
  -- Targeting
  target_mode   text NOT NULL DEFAULT 'all'
                  CHECK (target_mode IN ('all', 'include', 'exclude')),
  target_paths  text[] NOT NULL DEFAULT '{}',             -- paths / prefixes; supports a trailing '*' wildcard
  audience      text NOT NULL DEFAULT 'everyone'
                  CHECK (audience IN ('everyone', 'anon', 'auth')),  -- everyone / logged-out only / logged-in only
  -- Behaviour
  frequency     text NOT NULL DEFAULT 'always'
                  CHECK (frequency IN ('always', 'session', 'daily', 'once')),
  trigger       text NOT NULL DEFAULT 'load'
                  CHECK (trigger IN ('load', 'delay', 'exit')),      -- modal/corner reveal timing
  delay_seconds int NOT NULL DEFAULT 0,
  dismissible   boolean NOT NULL DEFAULT true,
  priority      int NOT NULL DEFAULT 0,                   -- higher wins when several match the same slot
  -- Tracking
  utm           jsonb NOT NULL DEFAULT '{}'::jsonb,       -- { source, medium, campaign, content, term }
  -- Schedule
  starts_at     timestamptz,                              -- null = no start bound
  ends_at       timestamptz,                              -- null = no end bound
  active        boolean NOT NULL DEFAULT true,
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS announcements_live_idx
  ON public.announcements (active, starts_at, ends_at);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. anonymous visitors) may read only currently-live promotions.
DROP POLICY IF EXISTS "Anyone reads live announcements" ON public.announcements;
CREATE POLICY "Anyone reads live announcements"
  ON public.announcements FOR SELECT
  TO anon, authenticated
  USING (
    active
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at   IS NULL OR ends_at   >= now())
  );

-- Admins read every row (drafts, scheduled, paused, ended) for the dashboard.
DROP POLICY IF EXISTS "Admins read all announcements" ON public.announcements;
CREATE POLICY "Admins read all announcements"
  ON public.announcements FOR SELECT
  USING (public.is_admin());

-- Only admins create / edit / delete promotions.
DROP POLICY IF EXISTS "Admins manage announcements" ON public.announcements;
CREATE POLICY "Admins manage announcements"
  ON public.announcements FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ── 2. Impression / click / dismiss events ───────────────────
CREATE TABLE IF NOT EXISTS public.announcement_events (
  id              bigserial PRIMARY KEY,
  announcement_id bigint NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  event           text NOT NULL CHECK (event IN ('impression', 'click', 'dismiss')),
  session_id      text,
  page            text,
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_role       text,                                   -- 'anonymous' | 'customer' | staff role at event time
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS announcement_events_ann_idx
  ON public.announcement_events (announcement_id, event);
CREATE INDEX IF NOT EXISTS announcement_events_created_idx
  ON public.announcement_events (created_at);

ALTER TABLE public.announcement_events ENABLE ROW LEVEL SECURITY;

-- Insert-only for everyone (like analytics_events) — the storefront logs views,
-- clicks and dismissals for anonymous and signed-in visitors alike.
DROP POLICY IF EXISTS "Anyone logs announcement events" ON public.announcement_events;
CREATE POLICY "Anyone logs announcement events"
  ON public.announcement_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins may read the raw event stream.
DROP POLICY IF EXISTS "Admins read announcement events" ON public.announcement_events;
CREATE POLICY "Admins read announcement events"
  ON public.announcement_events FOR SELECT
  USING (public.is_admin());

-- ── 3. Per-announcement performance rollup ───────────────────
-- security_invoker so the caller's RLS applies — only admins can read the
-- underlying events, so only admins get real counts.
CREATE OR REPLACE VIEW public.announcement_stats
WITH (security_invoker = on) AS
  SELECT
    a.id AS announcement_id,
    count(*) FILTER (WHERE e.event = 'impression') AS impressions,
    count(*) FILTER (WHERE e.event = 'click')      AS clicks,
    count(*) FILTER (WHERE e.event = 'dismiss')    AS dismisses
  FROM public.announcements a
  LEFT JOIN public.announcement_events e ON e.announcement_id = a.id
  GROUP BY a.id;

GRANT SELECT ON public.announcement_stats TO authenticated;

-- ── 4. Public image bucket ───────────────────────────────────
-- Public so anonymous visitors can render promo images by URL; writes are
-- admin-only.
INSERT INTO storage.buckets (id, name, public)
VALUES ('announcements', 'announcements', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone reads announcement images" ON storage.objects;
CREATE POLICY "Anyone reads announcement images" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'announcements');

DROP POLICY IF EXISTS "Admins upload announcement images" ON storage.objects;
CREATE POLICY "Admins upload announcement images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'announcements' AND public.is_admin());

DROP POLICY IF EXISTS "Admins delete announcement images" ON storage.objects;
CREATE POLICY "Admins delete announcement images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'announcements' AND public.is_admin());
