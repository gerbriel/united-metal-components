-- ============================================================
-- Migration 037: Cart stage (browsing vs. checkout)
-- ============================================================
-- Track whether a cart is just active or has reached the checkout page, so staff
-- can see who's about to buy. Extends sync_cart with a stage argument (defaults
-- to 'active', so any older client calling with 3 args still works).

ALTER TABLE public.carts
  ADD COLUMN IF NOT EXISTS stage TEXT NOT NULL DEFAULT 'active'
    CHECK (stage IN ('active', 'checkout'));

DROP FUNCTION IF EXISTS public.sync_cart(TEXT, JSONB, INT);

CREATE OR REPLACE FUNCTION public.sync_cart(
  p_session_id TEXT,
  p_items      JSONB,
  p_item_count INT,
  p_stage      TEXT DEFAULT 'active'
)
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
    INSERT INTO public.carts (session_id, user_id, items, item_count, stage, updated_at)
    VALUES (p_session_id, auth.uid(), COALESCE(p_items, '[]'::jsonb), p_item_count,
            COALESCE(NULLIF(p_stage, ''), 'active'), NOW())
    ON CONFLICT (session_id) DO UPDATE
      SET user_id    = auth.uid(),
          items      = EXCLUDED.items,
          item_count = EXCLUDED.item_count,
          stage      = EXCLUDED.stage,
          updated_at = NOW();
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_cart(TEXT, JSONB, INT, TEXT) TO anon, authenticated;
