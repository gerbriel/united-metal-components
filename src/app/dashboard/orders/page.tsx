export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ORDER_STATUS_LABEL, isWarehouseRole } from '@/types/database'

export const metadata: Metadata = { title: 'Orders — Dashboard' }

const ALL_STATUS_TABS = [
  'all', 'pending', 'confirmed', 'processing',
  'ready_for_pickup', 'loading', 'completed', 'cancelled',
]

// Warehouse only sees active workflow statuses; pending/cancelled/all hidden
const WAREHOUSE_STATUS_TABS = ['confirmed', 'processing', 'ready_for_pickup', 'loading', 'completed']
const WAREHOUSE_STATUSES_IN = ['confirmed', 'processing', 'ready_for_pickup', 'loading', 'completed']

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

interface Props { searchParams: Promise<{ status?: string }> }

export default async function DashboardOrdersPage({ searchParams }: Props) {
  const { status } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, employee_role')
    .eq('id', user!.id)
    .single()

  const isWarehouse = isWarehouseRole((profile as any)?.role, (profile as any)?.employee_role)

  // For warehouse: default to 'confirmed' when no status param
  const effectiveStatus = status ?? (isWarehouse ? 'confirmed' : undefined)

  let query = supabase
    .from('orders')
    .select('*, profiles(first_name, last_name, full_name, phone), order_items(id)')
    .order('created_at', { ascending: false })

  if (isWarehouse) {
    // Warehouse always restricted to their visible statuses
    if (effectiveStatus && WAREHOUSE_STATUSES_IN.includes(effectiveStatus)) {
      query = query.eq('status', effectiveStatus as any)
    } else {
      query = query.in('status', WAREHOUSE_STATUSES_IN as any[])
    }
  } else {
    if (effectiveStatus && effectiveStatus !== 'all') {
      query = query.eq('status', effectiveStatus as any)
    }
  }

  const { data: orders } = await query

  const tabs = isWarehouse ? WAREHOUSE_STATUS_TABS : ALL_STATUS_TABS

  const isTabActive = (s: string) => {
    if (isWarehouse) return s === effectiveStatus
    return (s === 'all' && !status) || s === status
  }

  const tabHref = (s: string) => {
    if (isWarehouse) return `/dashboard/orders?status=${s}`
    return s === 'all' ? '/dashboard/orders' : `/dashboard/orders?status=${s}`
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Orders</h1>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((s) => (
          <Link
            key={s}
            href={tabHref(s)}
            className={`px-3 py-1.5 rounded-md text-xs whitespace-nowrap font-medium transition-colors ${
              isTabActive(s)
                ? 'bg-primary text-white'
                : 'bg-white border hover:bg-slate-50'
            }`}
          >
            {s === 'all' ? 'All' : (ORDER_STATUS_LABEL[s] ?? s)}
          </Link>
        ))}
      </div>

      <Card>
        <div className="divide-y">
          {orders?.length === 0 && (
            <CardContent className="p-8 text-center text-muted-foreground">No orders found.</CardContent>
          )}
          {orders?.map((o) => {
            const p = o.profiles as any
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
                    {!isWarehouse && (
                      <p className="text-sm font-bold">${o.total.toFixed(2)}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{(o.order_items as any[])?.length} item(s)</p>
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
