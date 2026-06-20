'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ORDER_STATUS_LABEL } from '@/types/database'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface OrderItem {
  id: number
  item_color: string | null
  products: { name: string; product_type: string; coil_category: string | null } | null
}

interface OrderRow {
  id: number
  status: string
  created_at: string
  profiles: { first_name: string | null; last_name: string | null; full_name: string | null } | null
  order_items: OrderItem[]
}

// Columns shown on the TV board — no pending, no cancelled
const TV_STATUSES = ['confirmed', 'processing', 'ready_for_pickup', 'loading', 'completed'] as const

const STATUS_BG: Record<string, string> = {
  confirmed:        'bg-blue-600',
  processing:       'bg-purple-600',
  ready_for_pickup: 'bg-emerald-600',
  loading:          'bg-orange-500',
  completed:        'bg-slate-600',
}

const STATUS_TEXT: Record<string, string> = {
  confirmed:        'text-blue-50',
  processing:       'text-purple-50',
  ready_for_pickup: 'text-emerald-50',
  loading:          'text-orange-50',
  completed:        'text-slate-200',
}

// Palette — deterministic color → CSS swatch background
// Matches common panel color names used in the industry
const COLOR_SWATCHES: Record<string, string> = {
  'galvalume':      '#c0c0a0',
  'white':          '#f5f5f5',
  'black':          '#222222',
  'red':            '#c0392b',
  'bright red':     '#e74c3c',
  'green':          '#27ae60',
  'forest green':   '#1e6b3b',
  'blue':           '#2980b9',
  'tan':            '#c8a96e',
  'gray':           '#7f8c8d',
  'grey':           '#7f8c8d',
  'charcoal':       '#4a4a4a',
  'brown':          '#795548',
  'beige':          '#d4b896',
  'clay':           '#a0856e',
  'slate':          '#607d8b',
  'bronze':         '#8d6e63',
}

function swatchColor(color: string): string {
  return COLOR_SWATCHES[color.toLowerCase()] ?? '#6b7280'
}

function panelColors(items: OrderItem[]): string[] {
  const colors = new Set<string>()
  items.forEach((item) => {
    if (
      item.item_color &&
      item.products?.product_type === 'coil' &&
      item.products.coil_category === 'panel'
    ) {
      colors.add(item.item_color)
    }
  })
  return [...colors]
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
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data } = await supabase
      .from('orders')
      .select(`
        id, status, created_at,
        profiles(first_name, last_name, full_name),
        order_items(id, item_color, products(name, product_type, coil_category))
      `)
      .in('status', TV_STATUSES as unknown as string[])
      // For completed: only last 24h. For active: all.
      // Filter applied in JS below — simpler than a complex OR query.
      .order('created_at', { ascending: true })

    if (data) {
      const now = Date.now()
      const filtered = (data as unknown as OrderRow[]).filter((o) => {
        if (o.status === 'completed') {
          return now - new Date(o.created_at).getTime() < 24 * 60 * 60 * 1000
        }
        return true
      })
      setOrders(filtered)
      setUpdated(new Date())
    }
  }, [])

  useEffect(() => {
    fetchOrders()
    const channel = supabase
      .channel('tv-orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchOrders])

  // Group by status; within each column sort by panel color so same-color orders cluster
  const grouped = TV_STATUSES.reduce<Record<string, OrderRow[]>>((acc, s) => {
    const col = orders.filter((o) => o.status === s)
    // Sort confirmed/processing by panel color so operator can batch same-color runs
    if (s === 'confirmed' || s === 'processing') {
      col.sort((a, b) => {
        const ca = panelColors(a.order_items)[0] ?? ''
        const cb = panelColors(b.order_items)[0] ?? ''
        return ca.localeCompare(cb)
      })
    }
    acc[s] = col
    return acc
  }, {} as Record<string, OrderRow[]>)

  const activeCount = orders.filter((o) => o.status !== 'completed').length

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
              {activeCount} active order{activeCount !== 1 ? 's' : ''} · Live
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

      {/* 5-column board */}
      <div className="grid grid-cols-5 gap-0 divide-x divide-slate-700 h-[calc(100vh-85px)]">
        {TV_STATUSES.map((status) => {
          const colOrders = grouped[status] ?? []
          return (
            <div key={status} className="flex flex-col overflow-hidden">
              {/* Column header */}
              <div className={`px-4 py-3 ${STATUS_BG[status]} flex items-center justify-between`}>
                <h2 className={`font-bold text-xs uppercase tracking-wide ${STATUS_TEXT[status]}`}>
                  {status === 'completed' ? 'Done (24h)' : ORDER_STATUS_LABEL[status]}
                </h2>
                <span className={`text-lg font-bold tabular-nums ${STATUS_TEXT[status]}`}>
                  {colOrders.length}
                </span>
              </div>

              {/* Order cards */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                {colOrders.length === 0 && (
                  <p className="text-slate-500 text-sm text-center py-6">None</p>
                )}
                {colOrders.map((o) => {
                  const p = o.profiles
                  const name = p?.first_name && p?.last_name
                    ? `${p.first_name} ${p.last_name}`
                    : p?.full_name ?? 'Unknown'
                  const colors = panelColors(o.order_items)

                  return (
                    <Link
                      key={o.id}
                      href={`/dashboard/orders/${o.id}`}
                      className="block rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-750 p-3.5 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-bold text-base">#{o.id}</p>
                        <span className="text-xs text-slate-400">
                          {o.order_items?.length ?? 0} item{(o.order_items?.length ?? 0) !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300 truncate">{name}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>

                      {/* Panel color chips */}
                      {colors.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {colors.map((c) => (
                            <span
                              key={c}
                              className="inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 bg-slate-700 text-slate-200 border border-slate-600"
                            >
                              <span
                                className="w-2.5 h-2.5 rounded-full border border-slate-500 shrink-0"
                                style={{ backgroundColor: swatchColor(c) }}
                              />
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
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
