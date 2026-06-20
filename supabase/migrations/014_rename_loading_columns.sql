-- ============================================================
-- Migration 014: Rename employee_confirmed columns to staff_confirmed
-- ============================================================
-- The 'employee' role was retired in favour of office_employee /
-- warehouse_employee. The loading checklist viewerRole was updated
-- from 'employee' to 'staff' which also renamed the column references.
-- Bring the DB in sync.

ALTER TABLE public.order_item_loading
  RENAME COLUMN employee_confirmed_at TO staff_confirmed_at;

ALTER TABLE public.order_item_loading
  RENAME COLUMN employee_confirmed_by TO staff_confirmed_by;
