-- ============================================================
-- Migration 017: Vendors, Purchase Orders, Inventory Approvals,
--                Special Order fields on order_items
-- ============================================================

-- ── 1. Vendors ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vendors (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  contact_name text,
  email        text,
  phone        text,
  address      text,
  notes        text,
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage vendors"
  ON public.vendors FOR ALL USING (public.is_staff());

-- Seed known vendors
INSERT INTO public.vendors (name) VALUES
  ('Pacific Metal'),
  ('Sky Metal'),
  ('Acero'),
  ('Precision Metal'),
  ('Clocker Metals'),
  ('Apple Fasteners'),
  ('Sierra Fasteners'),
  ('LCA Metals'),
  ('Janus'),
  ('Twin Metals')
ON CONFLICT DO NOTHING;

-- ── 2. Purchase Orders ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number      text UNIQUE,
  vendor_id      uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  status         text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'partial', 'received', 'cancelled')),
  order_date     date NOT NULL DEFAULT CURRENT_DATE,
  expected_date  date,
  received_date  date,
  subtotal       numeric(12,2),
  tax            numeric(12,2),
  total          numeric(12,2),
  notes          text,
  created_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage purchase orders"
  ON public.purchase_orders FOR ALL USING (public.is_staff());

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.purchase_orders;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public.purchase_orders REPLICA IDENTITY FULL;

-- ── 3. Purchase Order Line Items ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id             uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id        bigint REFERENCES public.products(id) ON DELETE SET NULL,
  description       text,            -- for items not in product catalog
  quantity          numeric(12,2) NOT NULL DEFAULT 1,
  unit              text,
  unit_cost         numeric(12,4),
  total_cost        numeric(12,2)
    GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  quantity_received numeric(12,2) NOT NULL DEFAULT 0,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage PO items"
  ON public.purchase_order_items FOR ALL USING (public.is_staff());

-- Link coils and tube bundles back to the PO they arrived on
ALTER TABLE public.product_coils
  ADD COLUMN IF NOT EXISTS po_id     uuid REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL;

ALTER TABLE public.tube_bundles
  ADD COLUMN IF NOT EXISTS po_id     uuid REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL;

-- ── 4. Inventory Approval Queue ───────────────────────────────
-- Warehouse employees submit inventory changes here.
-- Admins approve/reject before values are applied to actual tables.
CREATE TABLE IF NOT EXISTS public.inventory_entries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type      text NOT NULL
    CHECK (entry_type IN ('stock_qty', 'coil_weight', 'tube_bundle_qty')),
  product_id      bigint  REFERENCES public.products(id)      ON DELETE CASCADE,
  coil_id         bigint  REFERENCES public.product_coils(id) ON DELETE CASCADE,
  tube_bundle_id  bigint  REFERENCES public.tube_bundles(id)  ON DELETE CASCADE,
  old_value       numeric(12,2),
  new_value       numeric(12,2) NOT NULL,
  status          text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at    timestamptz NOT NULL DEFAULT now(),
  reviewed_at     timestamptz,
  notes           text,
  admin_notes     text
);

ALTER TABLE public.inventory_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can insert inventory entries"
  ON public.inventory_entries FOR INSERT WITH CHECK (public.is_staff());
CREATE POLICY "Staff can view inventory entries"
  ON public.inventory_entries FOR SELECT USING (public.is_staff());
CREATE POLICY "Admin can update inventory entries"
  ON public.inventory_entries FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_entries;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public.inventory_entries REPLICA IDENTITY FULL;

-- ── 5. Special order tracking on order_items ─────────────────
-- When stock_qty = 0, the item is ordered specially.
-- Employee sets estimated_arrival_date when confirming the order.
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS is_special_order       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS estimated_arrival_date date;
