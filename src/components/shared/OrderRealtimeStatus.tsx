'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { OrderStatus } from '@/types/database'

const statusLabels: Record<string, string> = {
  pending:          'Waiting for confirmation',
  confirmed:        'Order confirmed — being prepared',
  processing:       'Materials being prepared',
  ready_for_pickup: 'Ready for pickup!',
  ready:            'Ready for pickup!',
  loading:          'Loading — please proceed to our facility',
  completed:        'Order completed',
  cancelled:        'Order cancelled',
}

export default function OrderRealtimeStatus({ orderId, initialStatus }: {
  orderId: number
  initialStatus: OrderStatus
}) {
  const [status, setStatus] = useState<OrderStatus>(initialStatus)
  const statusRef = useRef<OrderStatus>(initialStatus)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        (payload) => {
          const newStatus = payload.new.status as OrderStatus
          // The orders row is also UPDATEd by the totals-recompute trigger on
          // every staff line-price save, so this fires for non-status changes
          // too — only react when the status actually moved.
          if (newStatus === statusRef.current) return
          statusRef.current = newStatus
          setStatus(newStatus)
          toast.info(`Order status updated: ${newStatus.toUpperCase()}`)
          // The rest of the page is server-rendered off the order status
          // (progress steps, pricing visibility, checklists) — re-render it too.
          router.refresh()
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [orderId])

  const isReady     = status === 'ready' || status === 'ready_for_pickup'
  const isLoading   = status === 'loading'
  const isCancelled = status === 'cancelled'

  return (
    <div className={`text-sm font-medium px-3 py-2 rounded-md inline-flex items-center gap-2 ${
      isReady ? 'bg-green-50 text-green-700' :
      isLoading ? 'bg-orange-50 text-orange-700' :
      isCancelled ? 'bg-red-50 text-red-700' :
      'bg-blue-50 text-blue-700'
    }`}>
      <span className={`w-2 h-2 rounded-full animate-pulse ${
        isReady ? 'bg-green-500' :
        isLoading ? 'bg-orange-500' :
        isCancelled ? 'bg-red-500' :
        'bg-blue-500'
      }`} />
      {statusLabels[status] ?? status}
    </div>
  )
}
