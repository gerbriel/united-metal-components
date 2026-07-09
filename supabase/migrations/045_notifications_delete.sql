-- Let users dismiss (delete) their own notifications.
--
-- notifications shipped with SELECT / UPDATE / INSERT policies but no DELETE
-- policy (migration 001), so the dashboard's "Dismiss" and "Clear all" .delete()
-- calls were silently blocked by RLS: the UI removed the row optimistically but
-- the database kept it, so notifications reappeared on the next refresh.

DROP POLICY IF EXISTS "Users delete own notifications" ON public.notifications;
CREATE POLICY "Users delete own notifications"
  ON public.notifications FOR DELETE USING (auth.uid() = user_id);
