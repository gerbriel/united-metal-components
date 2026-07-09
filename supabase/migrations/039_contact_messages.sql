-- ── Contact messages ─────────────────────────────────────────
-- Public "Contact Us" submissions. Every message is stored for staff, matched
-- to an existing customer (CRM profile) by email then phone, and fanned out as
-- a notification to every office employee + admin. Warehouse staff don't handle
-- customer messages, so they neither see the table nor get notified.
--
-- The whole pipeline runs in SECURITY DEFINER triggers, so an anonymous
-- storefront visitor can submit a message and still trigger the customer match
-- and the staff notifications without any service-role key on the app side.

-- Office-or-admin check (is_staff() also covers warehouse, which we don't want).
CREATE OR REPLACE FUNCTION public.is_office_or_admin()
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role::text IN ('office_employee', 'admin')
  );
$$;

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id           bigserial PRIMARY KEY,
  name         text NOT NULL,
  email        text NOT NULL,
  phone        text,
  message      text NOT NULL,
  subscribed   boolean NOT NULL DEFAULT false,
  -- The existing customer this message was synced to (matched on email/phone),
  -- so staff can jump straight to the CRM profile. NULL = no match found.
  customer_id  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  read         boolean NOT NULL DEFAULT false,
  handled_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contact_messages_created_idx  ON public.contact_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS contact_messages_customer_idx ON public.contact_messages (customer_id);
CREATE INDEX IF NOT EXISTS contact_messages_unread_idx   ON public.contact_messages (read) WHERE read = false;

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous visitors) may submit a message; the SECURITY
-- DEFINER triggers do the privileged work. No SELECT for the submitter.
DROP POLICY IF EXISTS "Anyone can submit a contact message" ON public.contact_messages;
CREATE POLICY "Anyone can submit a contact message"
  ON public.contact_messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Office + admin read and update (mark read / claim).
DROP POLICY IF EXISTS "Office and admin can read contact messages" ON public.contact_messages;
CREATE POLICY "Office and admin can read contact messages"
  ON public.contact_messages FOR SELECT USING (public.is_office_or_admin());
DROP POLICY IF EXISTS "Office and admin can update contact messages" ON public.contact_messages;
CREATE POLICY "Office and admin can update contact messages"
  ON public.contact_messages FOR UPDATE USING (public.is_office_or_admin());

-- ── Match to an existing customer by email, then phone ────────
CREATE OR REPLACE FUNCTION public.contact_message_match_customer()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  matched uuid;
  digits  text;
BEGIN
  -- A logged-in customer always links to their own profile, no matter what
  -- email/phone they typed (auth.uid() is the session user even under SECURITY
  -- DEFINER). Staff submissions fall through to email/phone matching.
  IF auth.uid() IS NOT NULL THEN
    SELECT id INTO matched
    FROM public.profiles
    WHERE id = auth.uid() AND role::text = 'customer';
  END IF;

  IF matched IS NULL AND NEW.email IS NOT NULL AND length(trim(NEW.email)) > 0 THEN
    SELECT id INTO matched
    FROM public.profiles
    WHERE role::text = 'customer' AND lower(email) = lower(trim(NEW.email))
    ORDER BY created_at
    LIMIT 1;
  END IF;

  IF matched IS NULL AND NEW.phone IS NOT NULL THEN
    digits := regexp_replace(NEW.phone, '\D', '', 'g');
    IF length(digits) >= 10 THEN
      SELECT id INTO matched
      FROM public.profiles
      WHERE role::text = 'customer'
        AND right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 10) = right(digits, 10)
      ORDER BY created_at
      LIMIT 1;
    END IF;
  END IF;

  NEW.customer_id := matched;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contact_message_match ON public.contact_messages;
CREATE TRIGGER contact_message_match
  BEFORE INSERT ON public.contact_messages
  FOR EACH ROW EXECUTE FUNCTION public.contact_message_match_customer();

-- ── Fan out a notification to every office employee + admin ───
CREATE OR REPLACE FUNCTION public.contact_message_notify_staff()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message)
  SELECT p.id,
         'system',
         'New message from ' || NEW.name,
         left(NEW.message, 200)
  FROM public.profiles p
  WHERE p.role::text IN ('office_employee', 'admin');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contact_message_notify ON public.contact_messages;
CREATE TRIGGER contact_message_notify
  AFTER INSERT ON public.contact_messages
  FOR EACH ROW EXECUTE FUNCTION public.contact_message_notify_staff();

-- Live updates for the staff Messages inbox.
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public.contact_messages REPLICA IDENTITY FULL;
