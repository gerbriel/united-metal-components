-- ============================================================
-- Migration 011: Fix admin_update_user_profile overload conflict
-- ============================================================
-- Migrations 007, 009, and 010 each changed the param count, which
-- created three separate overloads instead of replacing the original.
-- PostgreSQL can't resolve which to call when params have defaults,
-- causing "could not choose best candidate" errors.
-- Also fixes: COALESCE(text, user_role) type mismatch — enum columns
-- need explicit CASE/CAST, not COALESCE with mixed types.

-- Drop every existing overload by explicit signature
DROP FUNCTION IF EXISTS public.admin_update_user_profile(uuid, text, text, text, text);
DROP FUNCTION IF EXISTS public.admin_update_user_profile(uuid, text, text, text, text, boolean);
DROP FUNCTION IF EXISTS public.admin_update_user_profile(uuid, text, text, text, text, boolean, text);

-- Single authoritative version with all current parameters
CREATE FUNCTION public.admin_update_user_profile(
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
    -- Enum columns require explicit CAST — COALESCE(text, enum) fails at runtime
    role = CASE
      WHEN p_role IS NOT NULL AND p_role <> '' THEN p_role::public.user_role
      ELSE role
    END,
    employee_role = CASE
      WHEN p_employee_role IS NOT NULL THEN NULLIF(p_employee_role, '')::public.employee_role
      ELSE employee_role
    END,
    -- Text / boolean columns can use COALESCE safely
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
                            END
  WHERE id = p_user_id;
END;
$$;
