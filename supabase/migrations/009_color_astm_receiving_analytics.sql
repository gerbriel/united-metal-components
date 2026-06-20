-- ============================================================
-- Migration 009: Color/ASTM on coils, item color on orders,
--                receiving permission, user segmentation in analytics
-- ============================================================

-- ── 1. Coil color + ASTM ─────────────────────────────────────
ALTER TABLE public.product_coils
  ADD COLUMN IF NOT EXISTS color     TEXT,   -- e.g. "Galvalume", "Bright Red" (panels + tubes)
  ADD COLUMN IF NOT EXISTS astm_code TEXT;   -- e.g. "A1011 CS Type B" — not required

-- ── 2. Panel color on order items ────────────────────────────
-- Captured at order time so the TV board can show what color panels each order needs.
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS item_color TEXT;  -- requested color for coil / panel products

-- ── 3. Inventory receiving permission ────────────────────────
-- Admin can grant this to specific employees so they can access the receiving view.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS can_receive_inventory BOOLEAN NOT NULL DEFAULT FALSE;

-- ── 4. User segmentation in analytics ────────────────────────
ALTER TABLE public.analytics_events
  ADD COLUMN IF NOT EXISTS user_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS user_role TEXT;  -- snapshot of role at event time: 'anonymous', 'customer', etc.

-- ── 5. Extend admin RPC to support can_receive_inventory ─────
CREATE OR REPLACE FUNCTION public.admin_update_user_profile(
  p_user_id              UUID,
  p_role                 TEXT    DEFAULT NULL,
  p_employee_role        TEXT    DEFAULT NULL,
  p_account_status       TEXT    DEFAULT NULL,
  p_suspended_reason     TEXT    DEFAULT NULL,
  p_can_receive_inventory BOOLEAN DEFAULT NULL
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
    can_receive_inventory = COALESCE(p_can_receive_inventory, can_receive_inventory)
  WHERE id = p_user_id;
END;
$$;
