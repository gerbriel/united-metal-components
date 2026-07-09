-- ── Agricultural (ag) customer type ──────────────────────────
-- Adds a third account type, 'ag' (agricultural), alongside retail and
-- contractor — so ag-exempt buyers (farms with an ag exemption) get their own
-- account type and pricing tier(s) instead of being shoehorned into retail or
-- contractor. Widens the two CHECK constraints that pin customer_type to
-- retail|contractor (profiles.customer_type from migration 010, and
-- pricing_tiers.customer_type from migration 041), then seeds an
-- "Agricultural (Tax Exempt)" tier under the new type.

-- profiles.customer_type — allow 'ag'.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_customer_type_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_customer_type_check
  CHECK (customer_type IN ('retail', 'contractor', 'ag'));

-- pricing_tiers.customer_type — allow 'ag'.
ALTER TABLE public.pricing_tiers DROP CONSTRAINT IF EXISTS pricing_tiers_customer_type_check;
ALTER TABLE public.pricing_tiers
  ADD CONSTRAINT pricing_tiers_customer_type_check
  CHECK (customer_type IN ('retail', 'contractor', 'ag'));

-- Seed the agricultural tax-exempt tier (admins can rename / add more from the
-- Pricing Tiers screen). Placed after the contractor tiers in sort order.
INSERT INTO public.pricing_tiers (key, label, customer_type, sort_order) VALUES
  ('ag_tax_exempt', 'Agricultural (Tax Exempt)', 'ag', 60)
ON CONFLICT (key) DO NOTHING;
