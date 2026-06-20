'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { ORDER_STATUS_LABEL } from '@/types/database'
import Link from 'next/link'

interface OrderRow {
  id: number
  status: string
  total: number
  created_at: string
  profiles: { first_name: string | null; last_name: string | null; full_name: string | null; phone: string | null } | null
  order_items: { id: number }[]
}

interface Props {
  initialOrders: OrderRow[]
  isWarehouse: boolean
  currentStatus?: string
}

const WAREHOUSE_STATUSES = ['confirmed', 'processing', 'ready_for_pickup', 'loading', 'completed']

const STATUS_COLORS: Record<string, string> = {
  pending:          'text-yellow-700 bg-yellow-50 border-yellow-200',
  confirmed:        'text-blue-700 bg-blue-50 border-blue-200',
  processing:       'text-purple-700 bg-purple-50 border-purple-200',
  ready_for_pickup: 'text-green-700 bg-green-50 border-green-200',
  ready:            'text-green-700 bg-green-50 border-green-200',
  loading:          'text-orange-700 bg-orange-50 border-orange-200',
  completed:        'text-slate-700 bg-slate-100 border-slate-200',
  cancelled:        'text-red-700 bg-red-50 border-red-200',
}

export default function RealtimeOrdersList({ initialOrders, isWarehouse, currentStatus }: Props) {
  const [orders, setOrders]       = useState<OrderRow[]>(initialOrders)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [flash, setFlash]         = useState(false)
  const supabase = createClient()
  const flashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const fetchOrders = useCallback(async () => {
    let q = supabase
      .from('orders')
      .select('id, status, total, created_at, profiles(first_name, last_name, full_name, phone), order_items(id)')
      .order('created_at', { ascending: false })

    if (isWarehouse) {
      if (currentStatus && WAREHOUSE_STATUSES.includes(currentStatus)) {
        q = q.eq('status', currentStatus as any)
      } else {
        q = q.in('status', WAREHOUSE_STATUSES as any[])
      }
    } else {
      if (currentStatus && currentStatus !== 'all') {
        q = q.eq('status', currentStatus as any)
      }
    }

    const { data } = await q
    if (data) {
      setOrders(data as unknown as OrderRow[])
      setLastUpdate(new Date())
      // Flash indicator to signal a live update
      setFlash(true)
      clearTimeout(flashTimer.current)
      flashTimer.current = setTimeout(() => setFlash(false), 1200)
    }
  }, [currentStatus, isWarehouse])

  useEffect(() => {
    const channel = supabase
      .channel('orders-realtime-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      clearTimeout(flashTimer.current)
    }
  }, [fetchOrders])

  return (
    <div className="space-y-3">
      <div className={`flex justify-end transition-colors ${flash ? 'text-green-600' : 'text-muted-foreground'}`}>
        <span className="text-xs flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${flash ? 'bg-green-500' : 'bg-slate-300'}`} />
          {lastUpdate ? `Live · ${lastUpdate.toLocaleTimeString()}` : 'Live'}
        </span>
      </div>

      <Card>
        <div className="divide-y">
          {orders.length === 0 && (
            <CardContent className="p-8 text-center text-muted-foreground">No orders found.</CardContent>
          )}
          {orders.map((o) => {
            const p = o.profiles
            const name = p?.first_name && p?.last_name
              ? `${p.first_name} ${p.last_name}`
              : p?.full_name ?? 'Unknown'

            return (
              <Link
                key={o.id}
                href={`/dashboard/orders/${o.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
              >
                <div>
                  <p className="font-semibold text-sm">Order #{o.id}</p>
                  <p className="text-xs text-muted-foreground">{name}</p>
                  <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    {!isWarehouse && <p className="text-sm font-bold">${o.total.toFixed(2)}</p>}
                    <p className="text-xs text-muted-foreground">{o.order_items?.length ?? 0} item(s)</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium border ${STATUS_COLORS[o.status] ?? ''}`}>
                    {ORDER_STATUS_LABEL[o.status] ?? o.status}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
