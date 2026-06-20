export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import OrdersClientShell from '@/components/shared/OrdersClientShell'
import type { Metadata } from 'next'
import { ORDER_STATUS_LABEL, isWarehouseRole, isAdminRole } from '@/types/database'
import { Tv } from 'lucide-react'

export const metadata: Metadata = { title: 'Orders — Dashboard' }

const ALL_STATUS_TABS = [
  'pending', 'confirmed', 'processing',
  'ready_for_pickup', 'loading', 'completed', 'cancelled', 'all',
]

const WAREHOUSE_STATUS_TABS = ['confirmed', 'processing', 'ready_for_pickup', 'loading', 'completed']
const WAREHOUSE_STATUSES_IN = ['confirmed', 'processing', 'ready_for_pickup', 'loading', 'completed']

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

  const isWarehouse = isWarehouseRole((profile as any)?.role)
  const isAdmin     = isAdminRole((profile as any)?.role ?? '')
  const effectiveStatus = status ?? (isWarehouse ? 'confirmed' : 'pending')

  let query = supabase
    .from('orders')
    .select('id, status, total, created_at, profiles(first_name, last_name, full_name, phone, pricing_tier), order_items(id)')
    .order('created_at', { ascending: false })

  if (isWarehouse) {
    if (effectiveStatus && WAREHOUSE_STATUSES_IN.includes(effectiveStatus)) {
      query = query.eq('status', effectiveStatus as any)
    } else {
      query = query.in('status', WAREHOUSE_STATUSES_IN as any[])
    }
  } else if (effectiveStatus && effectiveStatus !== 'all') {
    query = query.eq('status', effectiveStatus as any)
  }

  const { data: rawOrders } = await query

  const initialOrders = isAdmin
    ? rawOrders
    : (rawOrders ?? []).filter((o) =>
        o.status !== 'completed' ||
        (o.profiles as any)?.pricing_tier !== 'contractor_tax_exempt_tbd'
      )

  const tabs = isWarehouse ? WAREHOUSE_STATUS_TABS : ALL_STATUS_TABS

  const isTabActive = (s: string) => s === effectiveStatus

  const tabHref = (s: string) => `/dashboard/orders?status=${s}`

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Orders</h1>
        <Link
          href="/dashboard/orders/tv"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border rounded-md px-2.5 py-1.5"
        >
          <Tv className="w-3.5 h-3.5" />
          TV Mode
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((s) => (
          <Link
            key={s}
            href={tabHref(s)}
            className={`px-3 py-1.5 rounded-md text-xs whitespace-nowrap font-medium transition-colors ${
              isTabActive(s) ? 'bg-primary text-white' : 'bg-white border hover:bg-slate-50'
            }`}
          >
            {s === 'all' ? 'All' : (ORDER_STATUS_LABEL[s] ?? s)}
          </Link>
        ))}
      </div>

      <OrdersClientShell
        initialOrders={(initialOrders ?? []) as any}
        isWarehouse={isWarehouse}
        isAdmin={isAdmin}
        currentStatus={effectiveStatus}
      />
    </div>
  )
}
