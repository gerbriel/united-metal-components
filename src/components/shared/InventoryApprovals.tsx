'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle, XCircle, Loader2, ClipboardList } from 'lucide-react'

export interface InventoryEntry {
  id: string
  entry_type: 'stock_qty' | 'coil_weight' | 'tube_bundle_qty'
  old_value: number | null
  new_value: number
  status: 'pending' | 'approved' | 'rejected'
  submitted_at: string
  notes: string | null
  admin_notes: string | null
  product_id: number | null
  coil_id: number | null
  tube_bundle_id: number | null
  products?: { name: string; sku: string | null } | null
  product_coils?: { coil_identifier: string; color: string | null } | null
  tube_bundles?: { bundle_identifier: string | null; gauge: string } | null
  submitter?: { full_name: string | null } | null
}

const TYPE_LABEL: Record<string, string> = {
  stock_qty:       'Stock Quantity',
  coil_weight:     'Coil Weight (lbs)',
  tube_bundle_qty: 'Tube Bundle Qty',
}

export default function InventoryApprovals({ initialEntries }: { initialEntries: InventoryEntry[] }) {
  const [entries, setEntries] = useState(initialEntries)
  const [loading, setLoading] = useState<string | null>(null)
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({})
  const [filter, setFilter] = useState<'pending' | 'all'>('pending')
  const supabase = createClient()
  const router = useRouter()

  const pending = entries.filter((e) => e.status === 'pending')
  const displayed = filter === 'pending' ? pending : entries

  const handleApprove = async (entry: InventoryEntry) => {
    setLoading(entry.id)
    // Apply the inventory change
    let applyError: any = null
    if (entry.entry_type === 'stock_qty' && entry.product_id) {
      const { error } = await supabase
        .from('products')
        .update({ stock_qty: entry.new_value })
        .eq('id', entry.product_id)
      applyError = error
    } else if (entry.entry_type === 'coil_weight' && entry.coil_id) {
      const { error } = await supabase
        .from('product_coils')
        .update({ current_weight_lbs: entry.new_value, last_weighed_at: new Date().toISOString() })
        .eq('id', entry.coil_id)
      applyError = error
    } else if (entry.entry_type === 'tube_bundle_qty' && entry.tube_bundle_id) {
      const { error } = await supabase
        .from('tube_bundles')
        .update({ available_bundles: entry.new_value })
        .eq('id', entry.tube_bundle_id)
      applyError = error
    }

    if (applyError) {
      toast.error('Failed to apply change: ' + applyError.message)
      setLoading(null)
      return
    }

    const { error } = await supabase
      .from('inventory_entries')
      .update({
        status:      'approved',
        reviewed_at: new Date().toISOString(),
        admin_notes: adminNotes[entry.id] || null,
      })
      .eq('id', entry.id)

    if (error) toast.error('Approved but failed to record: ' + error.message)
    else {
      toast.success('Approved and applied')
      setEntries((es) => es.map((e) => e.id === entry.id ? { ...e, status: 'approved' } : e))
      router.refresh()
    }
    setLoading(null)
  }

  const handleReject = async (entry: InventoryEntry) => {
    setLoading(entry.id + '-reject')
    const { error } = await supabase
      .from('inventory_entries')
      .update({
        status:      'rejected',
        reviewed_at: new Date().toISOString(),
        admin_notes: adminNotes[entry.id] || null,
      })
      .eq('id', entry.id)

    if (error) toast.error('Failed to reject')
    else {
      toast.success('Entry rejected')
      setEntries((es) => es.map((e) => e.id === entry.id ? { ...e, status: 'rejected' } : e))
    }
    setLoading(null)
  }

  const targetLabel = (e: InventoryEntry) => {
    if (e.product_id && e.products) return `${e.products.name}${e.products.sku ? ` (${e.products.sku})` : ''}`
    if (e.coil_id && e.product_coils) return `Coil ${e.product_coils.coil_identifier}${e.product_coils.color ? ` — ${e.product_coils.color}` : ''}`
    if (e.tube_bundle_id && e.tube_bundles) return `Bundle ${e.tube_bundles.bundle_identifier ?? e.tube_bundle_id} (${e.tube_bundles.gauge}GA)`
    return 'Unknown'
  }

  if (entries.length === 0) {
    return (
      <div className="py-16 text-center">
        <ClipboardList className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
        <p className="text-muted-foreground">No inventory change requests</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter('pending')}
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${filter === 'pending' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}
        >
          Pending ({pending.length})
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${filter === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}
        >
          All ({entries.length})
        </button>
      </div>

      <div className="space-y-3">
        {displayed.map((entry) => (
          <div key={entry.id} className="border rounded-xl p-4 space-y-3 bg-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="text-xs">{TYPE_LABEL[entry.entry_type]}</Badge>
                  {entry.status === 'pending'  && <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200 border">Pending</Badge>}
                  {entry.status === 'approved' && <Badge className="text-xs bg-green-100 text-green-700 border-green-200 border">Approved</Badge>}
                  {entry.status === 'rejected' && <Badge className="text-xs bg-red-100 text-red-600 border-red-200 border">Rejected</Badge>}
                </div>
                <p className="font-medium text-sm">{targetLabel(entry)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {entry.old_value != null ? `${entry.old_value} → ` : ''}<span className="font-semibold text-foreground">{entry.new_value}</span>
                  {' · '}
                  {entry.submitter?.full_name ?? 'Employee'} · {new Date(entry.submitted_at).toLocaleString()}
                </p>
                {entry.notes && <p className="text-xs text-muted-foreground italic mt-1">{entry.notes}</p>}
              </div>
            </div>

            {entry.status === 'pending' && (
              <div className="flex items-center gap-2 flex-wrap">
                <Input
                  placeholder="Admin notes (optional)"
                  value={adminNotes[entry.id] ?? ''}
                  onChange={(e) => setAdminNotes((n) => ({ ...n, [entry.id]: e.target.value }))}
                  className="flex-1 min-w-[200px] h-8 text-sm"
                />
                <Button
                  size="sm"
                  className="gap-1.5 bg-green-600 hover:bg-green-700"
                  onClick={() => handleApprove(entry)}
                  disabled={loading === entry.id}
                >
                  {loading === entry.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-red-600 border-red-300 hover:bg-red-50"
                  onClick={() => handleReject(entry)}
                  disabled={loading === entry.id + '-reject'}
                >
                  {loading === entry.id + '-reject' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                  Reject
                </Button>
              </div>
            )}

            {entry.status !== 'pending' && entry.admin_notes && (
              <p className="text-xs text-muted-foreground bg-slate-50 rounded px-3 py-2">
                Admin: {entry.admin_notes}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
