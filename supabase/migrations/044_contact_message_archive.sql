-- Contact-message inbox management: soft archive + admin hard delete.
-- Staff can already SELECT/UPDATE messages (migration 039, office_or_admin).
-- Archiving is just an UPDATE of the new `archived` flag, so it rides on the
-- existing UPDATE policy. Hard delete removes the row for good — gated to admins
-- only, matching the orders/PO hard-delete convention (migration 027).

ALTER TABLE public.contact_messages
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS contact_messages_archived_idx
  ON public.contact_messages (archived);

-- Admin-only hard delete. contact_messages has no child rows, so nothing cascades.
DROP POLICY IF EXISTS "Admins delete contact messages" ON public.contact_messages;
CREATE POLICY "Admins delete contact messages"
  ON public.contact_messages FOR DELETE USING (public.is_admin());
