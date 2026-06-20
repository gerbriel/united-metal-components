-- ============================================================
-- Migration 012: Update pricing_tier check constraint
-- ============================================================
-- Migration 010 ran before contractor_tax_exempt_tbd was added to
-- the allowed values, so the existing constraint is missing it.
-- Drop and recreate with the full set of valid tiers.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_pricing_tier_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_pricing_tier_check
    CHECK (pricing_tier IN (
      'retail',
      'retail_tax_exempt',
      'contractor',
      'contractor_tax_exempt_tbd',
      'contractor_tax_exempt'
    ));
