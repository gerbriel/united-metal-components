-- ============================================================
-- Migration 010: Pricing tiers, standard product lengths
-- ============================================================

-- ── 0. Customer account type + license fields ───────────────
-- 'retail'     = homeowner / one-off buyer → auto-assigned retail pricing
-- 'contractor' = business / contractor → admin reviews and assigns contractor tier
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS customer_type TEXT
    CHECK (customer_type IN ('retail', 'contractor')),
  ADD COLUMN IF NOT EXISTS contractor_license TEXT,   -- optional; e.g. CA contractor license #
  ADD COLUMN IF NOT EXISTS reseller_license TEXT;     -- optional; resale/reseller certificate #

-- ── 1. Customer pricing tier on profiles ─────────────────────
-- NULL = unassigned (admin hasn't reviewed yet → no prices shown)
-- 'retail'                 → standard public pricing, taxed
-- 'retail_tax_exempt'      → standard public pricing, tax exempt
-- 'contractor'             → contractor pricing, taxed
-- 'contractor_tax_exempt'  → contractor pricing, tax exempt (reseller's license on file)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pricing_tier TEXT
    CHECK (pricing_tier IN ('retail', 'retail_tax_exempt', 'contractor', 'contractor_tax_exempt_tbd', 'contractor_tax_exempt'));

-- ── 2. Contractor price per product ──────────────────────────
-- NULL = same as base price; admin sets per product
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS price_contractor NUMERIC(10, 2);

-- ── 3. Standard cut lengths per coil product ─────────────────
-- Stores available cut lengths in feet for panels, hat channels, braces.
-- e.g. {16,21,26,31} for panels; {2,3,16,21,26,31} for hat channels; {2,3} for braces.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS standard_lengths_ft NUMERIC[];

-- ── 4. Extend admin RPC to support pricing_tier updates ──────
CREATE OR REPLACE FUNCTION public.admin_update_user_profile(
  p_user_id               UUID,
  p_role                  TEXT    DEFAULT NULL,
  p_employee_role         TEXT    DEFAULT NULL,
  p_account_status        TEXT    DEFAULT NULL,
  p_suspended_reason      TEXT    DEFAULT NULL,
  p_can_receive_inventory BOOLEAN DEFAULT NULL,
  p_pricing_tier          TEXT    DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.profiles SET
    role                  = COALESCE(NULLIF(p_role, ''),                 role),
    employee_role         = CASE WHEN p_employee_role IS NOT NULL
                              THEN NULLIF(p_employee_role, '')::public.employee_role
                              ELSE employee_role END,
    account_status        = COALESCE(NULLIF(p_account_status, ''),       account_status),
    suspended_reason      = CASE WHEN p_account_status = 'suspended'
                              THEN p_suspended_reason
                              WHEN p_account_status = 'active'
                              THEN NULL
                              ELSE suspended_reason END,
    suspended_at          = CASE WHEN p_account_status = 'suspended' THEN NOW()
                              WHEN p_account_status = 'active' THEN NULL
                              ELSE suspended_at END,
    suspended_by          = CASE WHEN p_account_status = 'suspended' THEN auth.uid()
                              WHEN p_account_status = 'active' THEN NULL
                              ELSE suspended_by END,
    can_receive_inventory = COALESCE(p_can_receive_inventory, can_receive_inventory),
    pricing_tier          = CASE WHEN p_pricing_tier = '__clear__' THEN NULL
                              WHEN p_pricing_tier IS NOT NULL THEN p_pricing_tier
                              ELSE pricing_tier END
  WHERE id = p_user_id;
END;
$$;
