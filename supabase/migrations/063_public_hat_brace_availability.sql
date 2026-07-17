-- ============================================================
-- Migration 063: Public per-length hat/brace availability
-- ============================================================
-- The storefront hat-channel / brace pages showed availability from ONLY the
-- shared colorless coil POOL footage (public_coil_availability, migration 025) and
-- never looked at the pre-cut hat_brace_stock pieces (migration 062). So a product
-- with plenty of pre-cut pieces on hand but an empty coil pool read as
-- "Out of stock". This SECURITY DEFINER RPC exposes the per-length pre-cut piece
-- counts — net of pieces committed to open orders — to the anonymous storefront
-- (hat_brace_stock is staff-only under RLS). Mirrors public_trim_availability
-- (058) and public_panel_overstock (032); never exposes cost/coil/notes.

CREATE OR REPLACE FUNCTION public.public_hat_brace_availability()
RETURNS TABLE (
  product_id    bigint,
  length_ft     integer,
  available_qty integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH committed AS (
    -- Pieces of each (product, length) promised to open orders. Hat/brace order
    -- lines store their per-piece length in order_items.length_feet.
    SELECT oi.product_id, oi.length_feet AS length_ft, SUM(oi.quantity) AS qty
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.length_feet IS NOT NULL
      AND o.status IN ('pending', 'confirmed', 'processing', 'ready_for_pickup', 'loading')
    GROUP BY oi.product_id, oi.length_feet
  )
  SELECT hbs.product_id,
         hbs.length_ft,
         GREATEST(0, hbs.qty - COALESCE(c.qty, 0))::int AS available_qty
  FROM hat_brace_stock hbs
  LEFT JOIN committed c
    ON c.product_id = hbs.product_id AND c.length_ft = hbs.length_ft
  WHERE hbs.qty > 0;
$$;

GRANT EXECUTE ON FUNCTION public.public_hat_brace_availability() TO anon, authenticated;
