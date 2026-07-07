-- ============================================================
-- Migration 023: Office-staff editable customer type + pricing tier
-- ============================================================
-- Office employees (not just admins) need to promote a one-off customer
-- to a contractor and assign their pricing tier from the CRM. The
-- existing admin_update_user_profile RPC stays admin-only (it can change
-- role/suspension). This RPC is deliberately scoped to only customer_type
-- and pricing_tier, and only touches actual customer accounts — it can
-- never alter a staff account or grant a role.

CREATE OR REPLACE FUNCTION public.staff_update_customer_type(
  p_user_id       UUID,
  p_customer_type TEXT DEFAULT NULL,  -- 'retail' | 'contractor' | '__clear__'
  p_pricing_tier  TEXT DEFAULT NULL   -- pricing tier value | '__clear__'
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Office employees and admins only.
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role::text IN ('office_employee', 'admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.profiles SET
    customer_type = CASE
                      WHEN p_customer_type = '__clear__' THEN NULL
                      WHEN p_customer_type IS NOT NULL   THEN p_customer_type
                      ELSE customer_type
                    END,
    pricing_tier  = CASE
                      WHEN p_pricing_tier = '__clear__' THEN NULL
                      WHEN p_pricing_tier IS NOT NULL   THEN p_pricing_tier
                      ELSE pricing_tier
                    END
  WHERE id = p_user_id
    -- Never modify a staff account through this path.
    AND role::text = 'customer';
END;
$$;
