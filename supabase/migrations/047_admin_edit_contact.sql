-- Let admins edit a user's contact info (name / company / phone) from User
-- Management, alongside the existing role / status / tier controls.
--
-- Extends admin_update_user_profile (migration 011) with the contact params.
-- A NULL param leaves a column unchanged; an empty string clears it (NULLIF),
-- so the edit dialog can both set and blank a field. Drop the old signature
-- first so we keep a single authoritative overload (see migration 011).

DROP FUNCTION IF EXISTS public.admin_update_user_profile(uuid, text, text, text, text, boolean, text);

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
  p_phone                 TEXT    DEFAULT NULL
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
    -- Contact fields: NULL param = leave as-is, '' = clear, value = set.
    full_name    = CASE WHEN p_full_name    IS NOT NULL THEN NULLIF(p_full_name, '')    ELSE full_name    END,
    first_name   = CASE WHEN p_first_name   IS NOT NULL THEN NULLIF(p_first_name, '')   ELSE first_name   END,
    last_name    = CASE WHEN p_last_name    IS NOT NULL THEN NULLIF(p_last_name, '')    ELSE last_name    END,
    company_name = CASE WHEN p_company_name IS NOT NULL THEN NULLIF(p_company_name, '') ELSE company_name END,
    phone        = CASE WHEN p_phone        IS NOT NULL THEN NULLIF(p_phone, '')        ELSE phone        END
  WHERE id = p_user_id;
END;
$$;
