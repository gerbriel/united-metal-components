-- Finish color on purchase order line items.
-- Coil POs now record the ordered panel color so it reads on the PO and can
-- prefill the coil inventory record when the shipment is received.
ALTER TABLE public.purchase_order_items
  ADD COLUMN IF NOT EXISTS color text;
