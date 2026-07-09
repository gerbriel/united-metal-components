-- ============================================================
-- Migration 036: Customer email on profiles (CRM contact info)
-- ============================================================
-- profiles never stored the login email (it lives in auth.users), so the CRM
-- customer profile showed a blank email. Add an email column, backfill it,
-- capture it on signup, and keep it in sync if the user changes their email.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill from auth.users.
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE u.id = p.id AND p.email IS DISTINCT FROM u.email;

-- Extend the signup trigger to also capture email (keeps the existing
-- first/last/full name, phone, and company logic from migration 004).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE PLPGSQL SECURITY DEFINER SET SEARCH_PATH = public AS $$
DECLARE
  v_first TEXT;
  v_last  TEXT;
BEGIN
  v_first := NEW.raw_user_meta_data->>'first_name';
  v_last  := NEW.raw_user_meta_data->>'last_name';
  INSERT INTO public.profiles (id, first_name, last_name, full_name, phone, company_name, email)
  VALUES (
    NEW.id,
    v_first,
    v_last,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NULLIF(TRIM(COALESCE(v_first,'') || ' ' || COALESCE(v_last,'')), '')
    ),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'company_name',
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Keep profiles.email in sync when a user changes their auth email.
CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS TRIGGER LANGUAGE PLPGSQL SECURITY DEFINER SET SEARCH_PATH = public AS $$
BEGIN
  UPDATE public.profiles SET email = NEW.email WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_changed ON auth.users;
CREATE TRIGGER on_auth_user_email_changed
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW WHEN (NEW.email IS DISTINCT FROM OLD.email)
  EXECUTE FUNCTION public.sync_profile_email();
