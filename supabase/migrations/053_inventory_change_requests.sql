-- ============================================================
-- Migration 053: Generalize the inventory approval queue
-- ============================================================
-- Office employees can now Add / Edit / Archive inventory records (products,
-- coils, tube specs, tube bundles, overstock listings, ASTM codes), but every
-- such change is submitted to the approval queue first and an admin applies it.
--
-- The queue (inventory_entries, migration 017) previously modeled only numeric
-- edits to EXISTING rows: entry_type in ('stock_qty','coil_weight',
-- 'tube_bundle_qty') with a single old_value/new_value. That can't represent
-- "create a new coil with these ten fields." This migration adds a generic
-- 'record' entry that carries a target table, an operation, and a JSON payload
-- of the proposed values. Admins apply record entries from the approvals page
-- using their own client (the same pattern as the numeric entries) — no
-- dynamic SQL, no service role. Warehouse, admin, and receiving flows are
-- unchanged; hard deletes stay admin-only and never go through the queue.

-- ── 1. Allow a generic 'record' entry type alongside the numeric ones ─────────
ALTER TABLE public.inventory_entries
  DROP CONSTRAINT IF EXISTS inventory_entries_entry_type_check;
ALTER TABLE public.inventory_entries
  ADD CONSTRAINT inventory_entries_entry_type_check
  CHECK (entry_type IN ('stock_qty', 'coil_weight', 'tube_bundle_qty', 'record'));

-- ── 2. Numeric entries set new_value; record entries carry a payload instead ──
ALTER TABLE public.inventory_entries
  ALTER COLUMN new_value DROP NOT NULL;

-- ── 3. Generic record-change columns ─────────────────────────────────────────
ALTER TABLE public.inventory_entries
  ADD COLUMN IF NOT EXISTS target_table text
    CHECK (target_table IN ('products','product_coils','tube_specs','tube_bundles','panel_overstock','astm_codes')),
  ADD COLUMN IF NOT EXISTS operation text
    CHECK (operation IN ('create','update','archive','restore')),
  ADD COLUMN IF NOT EXISTS target_id  bigint,   -- pk of the affected row (NULL for create)
  ADD COLUMN IF NOT EXISTS payload    jsonb,     -- proposed column values for create/update
  ADD COLUMN IF NOT EXISTS summary    text;      -- human-readable line for the approvals list

-- A record entry must name its target + operation, and non-create ops need a
-- target row. Numeric entries (entry_type <> 'record') are unaffected.
ALTER TABLE public.inventory_entries
  DROP CONSTRAINT IF EXISTS inventory_entries_record_shape_check;
ALTER TABLE public.inventory_entries
  ADD CONSTRAINT inventory_entries_record_shape_check CHECK (
    entry_type <> 'record'
    OR (
      target_table IS NOT NULL
      AND operation IS NOT NULL
      AND (operation = 'create' OR target_id IS NOT NULL)
    )
  );

-- ── 4. Record who submitted, automatically ───────────────────────────────────
-- The existing insert paths (CoilManager weigh, InventoryActions stock_qty)
-- never set submitted_by, so the approvals list always showed "Employee". A
-- default fills it from the request's JWT for every future insert. Also repoint
-- the FK at profiles so the approvals query can embed the submitter's name
-- (auth.users has no full_name; profiles.id == auth.users.id).
ALTER TABLE public.inventory_entries
  ALTER COLUMN submitted_by SET DEFAULT auth.uid();

ALTER TABLE public.inventory_entries
  DROP CONSTRAINT IF EXISTS inventory_entries_submitted_by_fkey;
ALTER TABLE public.inventory_entries
  ADD CONSTRAINT inventory_entries_submitted_by_fkey
  FOREIGN KEY (submitted_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Speed up the "pending first" approvals view.
CREATE INDEX IF NOT EXISTS inventory_entries_status_idx
  ON public.inventory_entries (status, submitted_at DESC);
