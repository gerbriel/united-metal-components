'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, AlertCircle, AlertTriangle } from 'lucide-react'
import type { OrderStatus } from '@/types/database'

const ALL_STATUSES: OrderStatus[] = [
  'pending', 'confirmed', 'processing', 'ready_for_pickup', 'loading', 'completed', 'cancelled',
]

// Warehouse can only advance through their workflow; no cancel, no complete (auto)
const WAREHOUSE_STATUSES: OrderStatus[] = [
  'confirmed', 'processing', 'ready_for_pickup', 'loading',
]

const STATUS_LABELS: Record<string, string> = {
  pending:          'Pending',
  confirmed:        'Confirmed',
  processing:       'Processing',
  ready_for_pickup: 'Ready for Pickup',
  loading:          'Loading',
  completed:        'Completed',
  cancelled:        'Cancelled',
}

const STATUS_MESSAGES: Record<string, string> = {
  pending:          'Your order has been received and is pending confirmation.',
  confirmed:        'Your order has been confirmed and will be prepared shortly.',
  processing:       'Your order is being prepared by our warehouse team.',
  ready_for_pickup: 'Your order is ready for pickup at 9191 W Whitesbridge Ave, Fresno, CA 93706.',
  loading:          'Your order is being loaded. Please proceed to our facility.',
  completed:        'Your order is complete. Thank you for your business!',
  cancelled:        'Your order has been cancelled.',
}

interface Props {
  orderId: number
  customerId: string
  currentStatus: OrderStatus
  allItemsStaged?: boolean
  customerNoDefectsAt?: string | null
  warehouseMode?: boolean
}

export default function UpdateOrderStatus({
  orderId,
  customerId,
  currentStatus,
  allItemsStaged = false,
  customerNoDefectsAt,
  warehouseMode = false,
}: Props) {
  const statusList = warehouseMode ? WAREHOUSE_STATUSES : ALL_STATUSES
  const [newStatus, setNewStatus] = useState<OrderStatus>(currentStatus)
  const [notes, setNotes]         = useState('')
  const [loading, setLoading]     = useState(false)
  const supabase = createClient()
  const router = useRouter()

  // Staging gate: can't go to ready_for_pickup until all staged
  const isBlockedStaging =
    newStatus === 'ready_for_pickup' &&
    currentStatus === 'processing' &&
    !allItemsStaged

  // Completion gate: warehouse can't complete without customer confirmation
  // Office/admin see a warning but can override
  const isBlockedComplete =
    newStatus === 'completed' &&
    currentStatus === 'loading' &&
    !customerNoDefectsAt &&
    warehouseMode

  // Office/admin warning (non-blocking) when completing without confirmation
  const warnComplete =
    newStatus === 'completed' &&
    currentStatus === 'loading' &&
    !customerNoDefectsAt &&
    !warehouseMode

  const handleUpdate = async () => {
    if (newStatus === currentStatus) { toast.info('Status unchanged'); return }
    if (isBlockedStaging || isBlockedComplete) return
    setLoading(true)

    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
    if (error) { toast.error('Failed to update order'); setLoading(false); return }

    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('order_status_history').insert({
      order_id:   orderId,
      old_status: currentStatus,
      new_status: newStatus,
      changed_by: user?.id ?? null,
      notes:      notes || null,
    })

    // Notify customer
    await supabase.from('notifications').insert({
      user_id:  customerId,
      type:     'order_update',
      title:    `Order #${orderId} — ${STATUS_LABELS[newStatus] ?? newStatus}`,
      message:  STATUS_MESSAGES[newStatus] ?? `Your order status changed to ${newStatus}.`,
      order_id: orderId,
    })

    // Notify all staff
    await supabase.rpc('notify_all_staff', {
      p_order_id: orderId,
      p_title:    `Order #${orderId} → ${STATUS_LABELS[newStatus] ?? newStatus}`,
      p_message:  `Status changed from ${STATUS_LABELS[currentStatus] ?? currentStatus} to ${STATUS_LABELS[newStatus] ?? newStatus}.${notes ? ` Note: ${notes}` : ''}`,
    })

    toast.success(`Order updated to: ${STATUS_LABELS[newStatus] ?? newStatus}`)
    setNotes('')
    router.refresh()
    setLoading(false)
  }

  const hardBlocked = isBlockedStaging || isBlockedComplete

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Update Status</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label>New Status</Label>
          <Select value={newStatus} onValueChange={(v) => setNewStatus(v as OrderStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusList.map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isBlockedStaging && (
          <div className="flex items-start gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <p>All items must be checked off in the staging checklist before marking ready for pickup.</p>
          </div>
        )}

        {isBlockedComplete && (
          <div className="flex items-start gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <p>Customer must confirm all items loaded with no defects before completing the order.</p>
          </div>
        )}

        {warnComplete && (
          <div className="flex items-start gap-2 text-orange-700 bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <p>Customer has not confirmed the no-defects policy. You can still override as office staff.</p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Notes (optional)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal note or customer message..."
            rows={3}
          />
        </div>

        <Button
          className="w-full"
          onClick={handleUpdate}
          disabled={loading || newStatus === currentStatus || hardBlocked}
        >
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Update & Notify
        </Button>
      </CardContent>
    </Card>
  )
}
