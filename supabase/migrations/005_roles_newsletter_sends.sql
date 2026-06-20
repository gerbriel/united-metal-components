-- ============================================================
-- Migration 005: 4-value user roles + newsletter send tracking
-- ============================================================

-- ── 1. Expand user_role enum to 4 explicit values ─────────────
-- 'employee' stays in enum for backward compat (treated as office)
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'office_employee'    AFTER 'employee';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'warehouse_employee' AFTER 'office_employee';

-- ── 2. Update is_staff() to include all employee types ────────
-- role::text cast avoids PG error 55P04: new enum values cannot be
-- referenced as enum literals in the same transaction they were added.
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role::text IN ('employee', 'office_employee', 'warehouse_employee', 'admin')
  );
$$;

-- ── 3. Update is_warehouse() for new explicit role value ──────
CREATE OR REPLACE FUNCTION public.is_warehouse()
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND (
        role::text = 'warehouse_employee'
        OR (role::text = 'employee' AND employee_role = 'warehouse')
      )
  );
$$;

-- ── 4. Newsletter campaign recipients table ───────────────────
CREATE TABLE IF NOT EXISTS public.newsletter_campaign_recipients (
  id            BIGSERIAL PRIMARY KEY,
  campaign_id   BIGINT NOT NULL REFERENCES public.newsletter_campaigns(id) ON DELETE CASCADE,
  subscriber_id BIGINT REFERENCES public.newsletter_subscribers(id)        ON DELETE SET NULL,
  email         TEXT NOT NULL,
  name          TEXT,
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.newsletter_campaign_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage campaign recipients"
  ON public.newsletter_campaign_recipients FOR ALL
  USING (public.is_staff());
