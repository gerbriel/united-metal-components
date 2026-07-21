-- ============================================================
-- Migration 069: Users may create their OWN profile row
-- ============================================================
-- Normally handle_new_user (trigger on auth.users) creates the profiles row at
-- signup. But a signed-in session can exist WITHOUT a row — e.g. an OAuth
-- signup on a database whose trigger failed or predates newer columns, or a
-- row removed by staff. /signup/complete now UPSERTS the profile, which needs
-- an INSERT policy; WITH CHECK pins the row to the caller's own auth.uid(), so
-- a user can only ever create their own profile (role still defaults to
-- 'customer' — privileged fields remain admin-RPC-only to change).
-- Idempotent via the duplicate_object guard.

DO $$ BEGIN
  CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
