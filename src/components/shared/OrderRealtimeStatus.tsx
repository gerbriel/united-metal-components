'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { OrderStatus } from '@/types/database'

const statusLabels: Record<OrderStatus, string> = {
  pending:    'Waiting for confirmation',
  confirmed:  'Order confirmed — being prepared',
  processing: 'Materials being prepared',
  ready:      'Ready for pickup / shipping!',
  completed:  'Order completed',
  cancelled:  'Order cancelled',
}

export default function OrderRealtimeStatus({ orderId, initialStatus }: {
  orderId: number
  initialStatus: OrderStatus
}) {
  const [status, setStatus] = useState<OrderStatus>(initialStatus)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        (payload) => {
          const newStatus = payload.new.status as OrderStatus
          setStatus(newStatus)
          toast.info(`Order status updated: ${newStatus.toUpperCase()}`)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [orderId])

  return (
    <div className={`text-sm font-medium px-3 py-2 rounded-md inline-flex items-center gap-2 ${
      status === 'ready' ? 'bg-green-50 text-green-700' :
      status === 'cancelled' ? 'bg-red-50 text-red-700' :
      'bg-blue-50 text-blue-700'
    }`}>
      <span className={`w-2 h-2 rounded-full animate-pulse ${
        status === 'ready' ? 'bg-green-500' :
        status === 'cancelled' ? 'bg-red-500' :
        'bg-blue-500'
      }`} />
      {statusLabels[status]}
    </div>
  )
}
