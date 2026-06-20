'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ORDER_STATUS_LABEL } from '@/types/database'
import Link from 'next/link'
import { ArrowLeft, Maximize2 } from 'lucide-react'

interface OrderRow {
  id: number
  status: string
  created_at: string
  profiles: { first_name: string | null; last_name: string | null; full_name: string | null } | null
  order_items: { id: number }[]
}

const ACTIVE_STATUSES = ['confirmed', 'processing', 'ready_for_pickup', 'loading']

const STATUS_BG: Record<string, string> = {
  confirmed:        'bg-blue-600',
  processing:       'bg-purple-600',
  ready_for_pickup: 'bg-green-600',
  loading:          'bg-orange-500',
}

const STATUS_TEXT: Record<string, string> = {
  confirmed:        'text-blue-50',
  processing:       'text-purple-50',
  ready_for_pickup: 'text-green-50',
  loading:          'text-orange-50',
}

function Clock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="text-right">
      <p className="text-4xl font-mono font-bold tabular-nums">
        {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </p>
      <p className="text-sm text-slate-400">
        {time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>
    </div>
  )
}

export default function TVModePage() {
  const [orders, setOrders]   = useState<OrderRow[]>([])
  const [updated, setUpdated] = useState<Date | null>(null)
  const supabase = createClient()

  const fetchOrders = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('id, status, created_at, profiles(first_name, last_name, full_name), order_items(id)')
      .in('status', ACTIVE_STATUSES as any[])
      .order('created_at', { ascending: true })
    if (data) { setOrders(data as unknown as OrderRow[]); setUpdated(new Date()) }
  }, [])

  useEffect(() => {
    fetchOrders()
    const channel = supabase
      .channel('tv-orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchOrders])

  const grouped = ACTIVE_STATUSES.reduce<Record<string, OrderRow[]>>((acc, s) => {
    acc[s] = orders.filter((o) => o.status === s)
    return acc
  }, {})

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 text-white overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-slate-700">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/orders" className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">United Metal — Order Board</h1>
            <p className="text-sm text-slate-400">
              {orders.length} active order{orders.length !== 1 ? 's' : ''} · Live
              {updated && ` · ${updated.toLocaleTimeString()}`}
            </p>
          </div>
          <span className="flex items-center gap-1.5 text-xs text-green-400 border border-green-700 rounded px-2 py-0.5">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            Live
          </span>
        </div>
        <Clock />
      </div>

      {/* Column grid */}
      <div className="grid grid-cols-4 gap-0 divide-x divide-slate-700 h-[calc(100vh-85px)]">
        {ACTIVE_STATUSES.map((status) => {
          const colOrders = grouped[status] ?? []
          return (
            <div key={status} className="flex flex-col overflow-hidden">
              <div className={`px-5 py-3 ${STATUS_BG[status]} flex items-center justify-between`}>
                <h2 className={`font-bold text-sm uppercase tracking-wide ${STATUS_TEXT[status]}`}>
                  {ORDER_STATUS_LABEL[status]}
                </h2>
                <span className={`text-lg font-bold tabular-nums ${STATUS_TEXT[status]}`}>
                  {colOrders.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {colOrders.length === 0 && (
                  <p className="text-slate-500 text-sm text-center py-6">None</p>
                )}
                {colOrders.map((o) => {
                  const p = o.profiles
                  const name = p?.first_name && p?.last_name
                    ? `${p.first_name} ${p.last_name}`
                    : p?.full_name ?? 'Unknown'
                  return (
                    <Link
                      key={o.id}
                      href={`/dashboard/orders/${o.id}`}
                      className={`block rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-750 p-4 transition-colors`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-bold text-lg">#{o.id}</p>
                        <span className="text-xs text-slate-400">{o.order_items?.length ?? 0} items</span>
                      </div>
                      <p className="text-sm text-slate-300 truncate">{name}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
