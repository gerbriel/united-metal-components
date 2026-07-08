-- Migration 025: Public coil availability RPC
--
-- product_coils and order_items are staff-only under RLS, so the public
-- storefront cannot read them to show live linear-foot availability. This
-- SECURITY DEFINER function returns ONLY the aggregated net available footage
-- per panel color and for the shared hat-channel / brace pool — no raw coil or
-- order rows are ever exposed.
--
--   net_feet = estimated on-hand (current weight where a coil was weighed, else
--              its initial weight) / lbs-per-foot, minus footage committed to
--              open orders.
--
-- products.coil_category is unpopulated, so hat/brace demand is keyed by SKU.

CREATE OR REPLACE FUNCTION public.public_coil_availability()
RETURNS TABLE (category text, color text, net_feet numeric, has_unweighed boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH open_orders AS (
    SELECT id FROM orders
    WHERE status IN ('pending', 'confirmed', 'processing', 'ready_for_pickup', 'loading')
  ),
  panel_supply AS (
    SELECT c.color,
           SUM(COALESCE(c.current_weight_lbs, c.initial_weight_lbs)
               / NULLIF(c.lbs_per_linear_foot, 0)) AS on_hand,
           bool_or(c.current_weight_lbs IS NULL) AS has_unweighed
    FROM product_coils c
    WHERE c.coil_category = 'panel'
      AND NOT c.archived
      AND c.status <> 'depleted'
      AND c.color IS NOT NULL
    GROUP BY c.color
  ),
  panel_demand AS (
    SELECT oi.item_color AS color, SUM(oi.linear_feet) AS committed
    FROM order_items oi
    WHERE oi.order_id IN (SELECT id FROM open_orders)
      AND oi.item_color IS NOT NULL
      AND oi.linear_feet IS NOT NULL
    GROUP BY oi.item_color
  ),
  pool_supply AS (
    SELECT SUM(COALESCE(c.current_weight_lbs, c.initial_weight_lbs)
               / NULLIF(c.lbs_per_linear_foot, 0)) AS on_hand,
           bool_or(c.current_weight_lbs IS NULL) AS has_unweighed
    FROM product_coils c
    WHERE c.coil_category = 'hat_channel_brace'
      AND NOT c.archived
      AND c.status <> 'depleted'
  ),
  pool_demand AS (
    SELECT SUM(oi.linear_feet) AS committed
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id IN (SELECT id FROM open_orders)
      AND p.sku IN ('HAT-CHANNEL', 'BRACE')
      AND oi.linear_feet IS NOT NULL
  )
  SELECT 'panel'::text AS category,
         ps.color,
         COALESCE(ps.on_hand, 0) - COALESCE(pd.committed, 0) AS net_feet,
         COALESCE(ps.has_unweighed, false) AS has_unweighed
  FROM panel_supply ps
  LEFT JOIN panel_demand pd ON pd.color = ps.color
  UNION ALL
  SELECT 'pool'::text,
         NULL,
         COALESCE((SELECT on_hand FROM pool_supply), 0) - COALESCE((SELECT committed FROM pool_demand), 0),
         COALESCE((SELECT has_unweighed FROM pool_supply), false);
$$;

GRANT EXECUTE ON FUNCTION public.public_coil_availability() TO anon, authenticated;
