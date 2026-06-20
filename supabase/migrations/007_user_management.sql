-- ============================================================
-- Migration 007: Admin user management + realtime enablement
-- ============================================================

-- ── 1. Enable realtime on key tables ─────────────────────────
-- Required for live order board, admin user changes, notifications
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Full replica identity so realtime payloads include old values on UPDATE/DELETE
ALTER TABLE public.orders   REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- ── 2. Account management columns ────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status   TEXT NOT NULL DEFAULT 'active'
    CHECK (account_status IN ('active', 'suspended')),
  ADD COLUMN IF NOT EXISTS suspended_reason TEXT,
  ADD COLUMN IF NOT EXISTS suspended_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── 3. Allow staff to read all profiles ──────────────────────
-- Needed for CRM joins, admin user management, and realtime events
DO $$ BEGIN
  CREATE POLICY "Staff can view all profiles"
    ON public.profiles FOR SELECT
    USING (public.is_staff() OR id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 4. Admin-only RPC to update any user profile ─────────────
-- SECURITY DEFINER bypasses RLS — protected by explicit admin check inside
CREATE OR REPLACE FUNCTION public.admin_update_user_profile(
  p_user_id         UUID,
  p_role            TEXT    DEFAULT NULL,
  p_employee_role   TEXT    DEFAULT NULL,
  p_account_status  TEXT    DEFAULT NULL,
  p_suspended_reason TEXT   DEFAULT NULL
)
RETURNS VOID LANGUAGE PLPGSQL SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  UPDATE public.profiles SET
    role = CASE
      WHEN p_role IS NOT NULL THEN p_role::user_role
      ELSE role
    END,
    employee_role = CASE
      WHEN p_employee_role = '' OR p_employee_role = 'none' THEN NULL::employee_role
      WHEN p_employee_role IS NOT NULL              THEN p_employee_role::employee_role
      ELSE employee_role
    END,
    account_status = COALESCE(p_account_status, account_status),
    suspended_reason = CASE
      WHEN p_account_status = 'suspended' THEN p_suspended_reason
      WHEN p_account_status = 'active'    THEN NULL
      ELSE suspended_reason
    END,
    suspended_at = CASE
      WHEN p_account_status = 'suspended' AND account_status <> 'suspended' THEN NOW()
      WHEN p_account_status = 'active'                                       THEN NULL
      ELSE suspended_at
    END,
    suspended_by = CASE
      WHEN p_account_status = 'suspended' AND account_status <> 'suspended' THEN auth.uid()
      WHEN p_account_status = 'active'                                       THEN NULL
      ELSE suspended_by
    END
  WHERE id = p_user_id;
END;
$$;
