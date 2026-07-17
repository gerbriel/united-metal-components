import type { createClient } from '@/lib/supabase/client'

type BrowserClient = ReturnType<typeof createClient>

// Inventory tables an office employee may propose changes to. Mirrors the
// target_table CHECK in migration 053.
export type InventoryTargetTable =
  | 'products'
  | 'product_coils'
  | 'tube_specs'
  | 'tube_bundles'
  | 'panel_overstock'
  | 'astm_codes'

export type InventoryOperation = 'create' | 'update' | 'archive' | 'restore'

export interface InventoryRequestInput {
  targetTable: InventoryTargetTable
  operation: InventoryOperation
  // One-line description shown to the admin in the approvals list.
  summary: string
  // Row being changed (omit for create).
  targetId?: number | null
  // Proposed column values for create/update. Archive/restore leave this null —
  // the approver derives the patch (products use `active`, others `archived`).
  payload?: Record<string, unknown> | null
  // Optional submitter note.
  notes?: string | null
}

// Submit an inventory change to the approval queue instead of writing the live
// table. Admins apply it from the approvals page. submitted_by is filled by the
// column default (auth.uid()); new_value stays null for record entries.
export async function submitInventoryRequest(
  supabase: BrowserClient,
  { targetTable, operation, summary, targetId = null, payload = null, notes = null }: InventoryRequestInput,
) {
  return supabase.from('inventory_entries').insert({
    entry_type:   'record',
    target_table: targetTable,
    operation,
    target_id:    targetId,
    payload,
    summary,
    notes,
  } as never)
}
