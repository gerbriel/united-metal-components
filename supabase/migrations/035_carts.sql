-- ============================================================
-- Migration 035: Server-side shopping carts (CRM visibility)
-- ============================================================
-- The storefront cart is client-side only (Zustand + localStorage), so staff
-- have no way to see what customers/guests have added. This persists a snapshot
-- of each browser's cart so office/admin CRM can view active carts and send
-- reminders. One row per browser session; user_id is filled in once signed in
-- (null = guest). Staff-only read; clients write only through the RPC below.

CREATE TABLE IF NOT EXISTS public.carts (
  session_id  TEXT PRIMARY KEY,                                        -- client-generated (localStorage)
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,   -- null = guest
  items       JSONB NOT NULL DEFAULT '[]'::jsonb,                       -- [{productId,name,sku,quantity,length,lengthIn,color,overstock}]
  item_count  INT  NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS carts_user_id_idx    ON public.carts (user_id);
CREATE INDEX IF NOT EXISTS carts_updated_at_idx ON public.carts (updated_at DESC);

ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read carts" ON public.carts FOR SELECT USING (public.is_staff());

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.carts;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public.carts REPLICA IDENTITY FULL;

-- Clients never write the table directly. This SECURITY DEFINER upsert derives
-- user_id from auth.uid() (server-side, can't be spoofed; null for guests) and
-- removes the row when the cart empties.
CREATE OR REPLACE FUNCTION public.sync_cart(p_session_id TEXT, p_items JSONB, p_item_count INT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_session_id IS NULL OR length(p_session_id) = 0 THEN RETURN; END IF;
  IF COALESCE(p_item_count, 0) <= 0 THEN
    DELETE FROM public.carts WHERE session_id = p_session_id;
  ELSE
    INSERT INTO public.carts (session_id, user_id, items, item_count, updated_at)
    VALUES (p_session_id, auth.uid(), COALESCE(p_items, '[]'::jsonb), p_item_count, NOW())
    ON CONFLICT (session_id) DO UPDATE
      SET user_id    = auth.uid(),
          items      = EXCLUDED.items,
          item_count = EXCLUDED.item_count,
          updated_at = NOW();
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_cart(TEXT, JSONB, INT) TO anon, authenticated;
