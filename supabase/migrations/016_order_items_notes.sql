-- Migration 016: Add notes column to order_items for length/color/custom details
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS notes text;
