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
import { Loader2 } from 'lucide-react'
import type { OrderStatus } from '@/types/database'

const STATUSES: OrderStatus[] = ['pending', 'confirmed', 'processing', 'ready', 'completed', 'cancelled']

const statusMessages: Record<OrderStatus, string> = {
  pending:    'Your order has been received and is pending confirmation.',
  confirmed:  'Your order has been confirmed and will be prepared shortly.',
  processing: 'Your order is being prepared.',
  ready:      '🎉 Your order is ready for pickup!',
  completed:  'Your order has been completed. Thank you!',
  cancelled:  'Your order has been cancelled.',
}

interface Props {
  orderId: number
  customerId: string
  currentStatus: OrderStatus
}

export default function UpdateOrderStatus({ orderId, customerId, currentStatus }: Props) {
  const [newStatus, setNewStatus] = useState<OrderStatus>(currentStatus)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const handleUpdate = async () => {
    if (newStatus === currentStatus) { toast.info('Status unchanged'); return }
    setLoading(true)

    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
    if (error) { toast.error('Failed to update order'); setLoading(false); return }

    // Get current user for history
    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('order_status_history').insert({
      order_id: orderId,
      old_status: currentStatus,
      new_status: newStatus,
      changed_by: user?.id ?? null,
      notes: notes || null,
    })

    // Notify customer
    await supabase.from('notifications').insert({
      user_id: customerId,
      type: 'order_update',
      title: `Order #${orderId} — ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
      message: statusMessages[newStatus],
      order_id: orderId,
    })

    toast.success(`Order updated to: ${newStatus}`)
    setNotes('')
    router.refresh()
    setLoading(false)
  }

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
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Notes (optional)</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal note or customer message..." rows={3} />
        </div>
        <Button className="w-full" onClick={handleUpdate} disabled={loading || newStatus === currentStatus}>
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Update & Notify Customer
        </Button>
      </CardContent>
    </Card>
  )
}
