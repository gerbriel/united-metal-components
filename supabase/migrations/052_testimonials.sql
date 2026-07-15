-- ── Customer testimonials ────────────────────────────────────
-- Promotes the home-page "Customer Stories" testimonials from a hardcoded list
-- to a table that office employees and admins can CRUD (mirrors the
-- is_office_or_admin gating from 039). Anonymous visitors read only active ones.

CREATE TABLE IF NOT EXISTS public.testimonials (
  id          bigserial PRIMARY KEY,
  name        text NOT NULL,
  role        text,                                   -- e.g. "General Contractor"
  company     text,                                   -- e.g. "Rodriguez Construction"
  content     text NOT NULL,                          -- the quote
  rating      int NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  sort_order  int NOT NULL DEFAULT 0,                 -- carousel order (lower first)
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS testimonials_active_order_idx
  ON public.testimonials (active, sort_order);

-- Seed the three testimonials that were hardcoded in TestimonialsSection, but
-- only when the table is empty (idempotent — safe to re-run).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.testimonials) THEN
    INSERT INTO public.testimonials (name, role, company, content, rating, sort_order) VALUES
      ('Mike Rodriguez', 'General Contractor', 'Rodriguez Construction',
       'United Metal has been my go-to supplier for three years. Consistent quality, quick order turnaround, and their online ordering system makes reordering a breeze.',
       5, 10),
      ('Sarah Chen', 'DIY Builder', 'Homeowner',
       'I built my first carport using their kit and the experience was outstanding. Being able to track my order online and get notifications was a huge plus.',
       5, 20),
      ('James Thurston', 'Farm Operations Manager', 'Thurston Farms',
       'We''ve ordered everything from trusses to garage doors through their site. Consistent quality, great prices, and the team actually knows their products.',
       5, 30);
  END IF;
END $$;

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. anonymous visitors) reads active testimonials for the home page.
DROP POLICY IF EXISTS "Anyone reads active testimonials" ON public.testimonials;
CREATE POLICY "Anyone reads active testimonials"
  ON public.testimonials FOR SELECT
  TO anon, authenticated
  USING (active);

-- Office employees and admins also read hidden ones (for the dashboard list).
DROP POLICY IF EXISTS "Office and admin read all testimonials" ON public.testimonials;
CREATE POLICY "Office and admin read all testimonials"
  ON public.testimonials FOR SELECT
  USING (public.is_office_or_admin());

-- Office employees and admins create / edit / delete testimonials.
DROP POLICY IF EXISTS "Office and admin manage testimonials" ON public.testimonials;
CREATE POLICY "Office and admin manage testimonials"
  ON public.testimonials FOR ALL
  USING (public.is_office_or_admin()) WITH CHECK (public.is_office_or_admin());
