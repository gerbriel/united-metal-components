-- ============================================================
-- Migration 068: Admin can edit business fields + account type
-- ============================================================
-- User Management now shows and edits EVERYTHING the signup/settings forms
-- collect — so admin_update_user_profile (migration 047) gains: customer_type
-- (retail / contractor / ag — e.g. approving a one-off customer as a business
-- account), contractor/reseller license numbers, and the two addresses.
--
-- Same conventions as 047: NULL param = leave the column unchanged, empty
-- string = clear it (NULLIF). Drop the old signature first so a single
-- authoritative overload exists (PostgREST named-arg resolution).

DROP FUNCTION IF EXISTS public.admin_update_user_profile(
  uuid, text, text, text, text, boolean, text, text, text, text, text, text);

CREATE FUNCTION public.admin_update_user_profile(
  p_user_id               UUID,
  p_role                  TEXT    DEFAULT NULL,
  p_employee_role         TEXT    DEFAULT NULL,
  p_account_status        TEXT    DEFAULT NULL,
  p_suspended_reason      TEXT    DEFAULT NULL,
  p_can_receive_inventory BOOLEAN DEFAULT NULL,
  p_pricing_tier          TEXT    DEFAULT NULL,
  p_full_name             TEXT    DEFAULT NULL,
  p_first_name            TEXT    DEFAULT NULL,
  p_last_name             TEXT    DEFAULT NULL,
  p_company_name          TEXT    DEFAULT NULL,
  p_phone                 TEXT    DEFAULT NULL,
  p_customer_type         TEXT    DEFAULT NULL,
  p_contractor_license    TEXT    DEFAULT NULL,
  p_reseller_license      TEXT    DEFAULT NULL,
  p_mailing_address       TEXT    DEFAULT NULL,
  p_business_address      TEXT    DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.profiles SET
    role = CASE
      WHEN p_role IS NOT NULL AND p_role <> '' THEN p_role::public.user_role
      ELSE role
    END,
    employee_role = CASE
      WHEN p_employee_role IS NOT NULL THEN NULLIF(p_employee_role, '')::public.employee_role
      ELSE employee_role
    END,
    account_status        = COALESCE(NULLIF(p_account_status, ''),  account_status),
    suspended_reason      = CASE
                              WHEN p_account_status = 'suspended' THEN p_suspended_reason
                              WHEN p_account_status = 'active'    THEN NULL
                              ELSE suspended_reason
                            END,
    suspended_at          = CASE
                              WHEN p_account_status = 'suspended' THEN NOW()
                              WHEN p_account_status = 'active'    THEN NULL
                              ELSE suspended_at
                            END,
    suspended_by          = CASE
                              WHEN p_account_status = 'suspended' THEN auth.uid()
                              WHEN p_account_status = 'active'    THEN NULL
                              ELSE suspended_by
                            END,
    can_receive_inventory = COALESCE(p_can_receive_inventory, can_receive_inventory),
    pricing_tier          = CASE
                              WHEN p_pricing_tier = '__clear__' THEN NULL
                              WHEN p_pricing_tier IS NOT NULL   THEN p_pricing_tier
                              ELSE pricing_tier
                            END,
    -- Contact + business fields: NULL param = leave as-is, '' = clear, value = set.
    full_name          = CASE WHEN p_full_name          IS NOT NULL THEN NULLIF(p_full_name, '')          ELSE full_name          END,
    first_name         = CASE WHEN p_first_name         IS NOT NULL THEN NULLIF(p_first_name, '')         ELSE first_name         END,
    last_name          = CASE WHEN p_last_name          IS NOT NULL THEN NULLIF(p_last_name, '')          ELSE last_name          END,
    company_name       = CASE WHEN p_company_name       IS NOT NULL THEN NULLIF(p_company_name, '')       ELSE company_name       END,
    phone              = CASE WHEN p_phone              IS NOT NULL THEN NULLIF(p_phone, '')              ELSE phone              END,
    customer_type      = CASE WHEN p_customer_type      IS NOT NULL THEN NULLIF(p_customer_type, '')      ELSE customer_type      END,
    contractor_license = CASE WHEN p_contractor_license IS NOT NULL THEN NULLIF(p_contractor_license, '') ELSE contractor_license END,
    reseller_license   = CASE WHEN p_reseller_license   IS NOT NULL THEN NULLIF(p_reseller_license, '')   ELSE reseller_license   END,
    mailing_address    = CASE WHEN p_mailing_address    IS NOT NULL THEN NULLIF(p_mailing_address, '')    ELSE mailing_address    END,
    business_address   = CASE WHEN p_business_address   IS NOT NULL THEN NULLIF(p_business_address, '')   ELSE business_address   END
  WHERE id = p_user_id;
END;
$$;
