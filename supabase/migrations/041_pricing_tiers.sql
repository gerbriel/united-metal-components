-- ── Admin-managed pricing tiers ──────────────────────────────
-- Pricing tiers used to be a fixed CHECK constraint on profiles.pricing_tier
-- (migration 012) plus hardcoded lists in the app. This promotes them to a
-- table admins can CRUD (add / rename / reorder / deactivate), each tagged with
-- the account type it belongs to so retail customers only get retail tiers and
-- contractors only contractor tiers.

-- Admin-only check (mirrors is_staff / is_office_or_admin).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text = 'admin'
  );
$$;

CREATE TABLE IF NOT EXISTS public.pricing_tiers (
  id            bigserial PRIMARY KEY,
  key           text NOT NULL UNIQUE,                                   -- stored on profiles.pricing_tier
  label         text NOT NULL,
  customer_type text NOT NULL CHECK (customer_type IN ('retail', 'contractor')),
  sort_order    int NOT NULL DEFAULT 0,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Seed the existing fixed tiers so nothing breaks and the FK below is satisfiable.
INSERT INTO public.pricing_tiers (key, label, customer_type, sort_order) VALUES
  ('retail',                    'Retail',                            'retail',     10),
  ('retail_tax_exempt',         'Retail (Tax Exempt)',               'retail',     20),
  ('contractor',                'Contractor',                        'contractor', 30),
  ('contractor_tax_exempt_tbd', 'Contractor (Tax Exempt - Pending)', 'contractor', 40),
  ('contractor_tax_exempt',     'Contractor (Tax Exempt)',           'contractor', 50)
ON CONFLICT (key) DO NOTHING;

-- Replace the fixed CHECK on profiles.pricing_tier with a FK to the tier list.
-- ON UPDATE CASCADE lets a key rename propagate; ON DELETE SET NULL clears the
-- tier from customers if it's ever removed.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_pricing_tier_check;
DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_pricing_tier_fkey
    FOREIGN KEY (pricing_tier) REFERENCES public.pricing_tiers(key)
    ON UPDATE CASCADE ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.pricing_tiers ENABLE ROW LEVEL SECURITY;

-- Any signed-in user may read tier definitions (labels are shown across the
-- dashboard; they're not sensitive). Anonymous storefront visitors don't need them.
DROP POLICY IF EXISTS "Signed-in users can read pricing tiers" ON public.pricing_tiers;
CREATE POLICY "Signed-in users can read pricing tiers"
  ON public.pricing_tiers FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only admins manage the tier list.
DROP POLICY IF EXISTS "Admins manage pricing tiers" ON public.pricing_tiers;
CREATE POLICY "Admins manage pricing tiers"
  ON public.pricing_tiers FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
