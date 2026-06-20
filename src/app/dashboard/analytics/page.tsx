export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import AnalyticsCharts from '@/components/shared/AnalyticsCharts'
import AnalyticsTracker from '@/components/shared/AnalyticsTracker'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Analytics — Dashboard' }

interface Props { searchParams: Promise<{ days?: string }> }

export default async function AnalyticsPage({ searchParams }: Props) {
  const { days: daysParam } = await searchParams
  const days = Math.min(Math.max(parseInt(daysParam ?? '30', 10) || 30, 7), 365)

  const supabase = await createClient()
  const cutoff = new Date(Date.now() - days * 86400000).toISOString()

  const [
    { count: totalPageviews },
    { count: uniqueSessions },
    { data: rawTopPages },
    { data: recentOrders },
    { data: allOrders },
  ] = await Promise.all([
    supabase.from('analytics_events').select('*', { count: 'exact', head: true }).gte('created_at', cutoff),
    supabase.from('analytics_events').select('session_id', { count: 'exact', head: true }).gte('created_at', cutoff).not('session_id', 'is', null),
    supabase.from('analytics_events').select('page').gte('created_at', cutoff).limit(500),
    supabase.from('orders').select('id, status, total, created_at').gte('created_at', cutoff).order('created_at', { ascending: false }),
    supabase.from('orders').select('id, status, total, created_at').order('created_at', { ascending: false }).limit(1000),
  ])

  // Page views breakdown
  const pageMap: Record<string, number> = {}
  rawTopPages?.forEach((e) => { pageMap[e.page] = (pageMap[e.page] ?? 0) + 1 })
  const topPagesList = Object.entries(pageMap)
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([page, views]) => ({ page, views }))

  // Order metrics for selected period
  const periodOrders = recentOrders ?? []
  const completedOrders = periodOrders.filter((o) => o.status === 'completed')
  const periodRevenue   = completedOrders.reduce((s, o) => s + o.total, 0)
  const avgOrderValue   = completedOrders.length > 0 ? periodRevenue / completedOrders.length : 0

  // Order status breakdown (period)
  const statusBreakdown: Record<string, number> = {}
  periodOrders.forEach((o) => { statusBreakdown[o.status] = (statusBreakdown[o.status] ?? 0) + 1 })

  // Revenue by day (period) — group completed orders by date
  const revenueByDay: Record<string, number> = {}
  completedOrders.forEach((o) => {
    const day = new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    revenueByDay[day] = (revenueByDay[day] ?? 0) + o.total
  })

  // All-time totals
  const allCompleted  = (allOrders ?? []).filter((o) => o.status === 'completed')
  const lifetimeRevenue = allCompleted.reduce((s, o) => s + o.total, 0)

  const STATUS_LABELS: Record<string, string> = {
    pending: 'Pending', confirmed: 'Confirmed', processing: 'Processing',
    ready_for_pickup: 'Ready for Pickup', loading: 'Loading',
    completed: 'Completed', cancelled: 'Cancelled',
  }

  const DAYS_OPTIONS = [7, 14, 30, 60, 90]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground">Privacy-first — no cookies, no third parties.</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Period:</span>
          {DAYS_OPTIONS.map((d) => (
            <a
              key={d}
              href={`?days=${d}`}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${d === days ? 'bg-primary text-white' : 'bg-white border hover:bg-slate-50'}`}
            >
              {d}d
            </a>
          ))}
        </div>
      </div>

      {/* Traffic metrics */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">Site Traffic — Last {days} days</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: 'Page Views',   value: totalPageviews ?? 0 },
            { label: 'Sessions',     value: uniqueSessions ?? 0 },
            { label: 'Top Page',     value: topPagesList[0]?.page ?? '—' },
          ].map(({ label, value }) => (
            <Card key={label}>
              <CardContent className="p-5">
                <p className="text-2xl font-bold truncate">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Order/revenue metrics */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">Orders & Revenue — Last {days} days</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Orders',      value: periodOrders.length },
            { label: 'Completed Orders',  value: completedOrders.length },
            { label: 'Revenue (Completed)', value: `$${periodRevenue.toFixed(0)}` },
            { label: 'Avg Order Value',   value: completedOrders.length ? `$${avgOrderValue.toFixed(0)}` : '—' },
          ].map(({ label, value }) => (
            <Card key={label}>
              <CardContent className="p-5">
                <p className="text-2xl font-bold truncate">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* All-time revenue */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold text-primary">${lifetimeRevenue.toFixed(0)}</p>
            <p className="text-sm text-muted-foreground">All-time completed revenue · {allCompleted.length} orders</p>
          </div>
        </CardContent>
      </Card>

      <AnalyticsCharts />

      {/* Orders by status */}
      {Object.keys(statusBreakdown).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Orders by Status — Last {days} days</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-muted-foreground border-b">
                <tr>
                  <th className="text-left p-3">Status</th>
                  <th className="text-right p-3">Count</th>
                  <th className="text-right p-3">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {Object.entries(statusBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([status, count]) => (
                    <tr key={status} className="hover:bg-slate-50">
                      <td className="p-3 capitalize">{STATUS_LABELS[status] ?? status}</td>
                      <td className="p-3 text-right font-semibold">{count}</td>
                      <td className="p-3 text-right text-muted-foreground">
                        {((count / periodOrders.length) * 100).toFixed(0)}%
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Top pages */}
      <Card>
        <CardHeader><CardTitle className="text-base">Top Pages — Last {days} days</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-muted-foreground border-b">
              <tr>
                <th className="text-left p-3">Page</th>
                <th className="text-right p-3">Views</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {topPagesList.length === 0
                ? <tr><td colSpan={2} className="p-4 text-center text-muted-foreground">No data yet</td></tr>
                : topPagesList.map(({ page, views }) => (
                  <tr key={page} className="hover:bg-slate-50">
                    <td className="p-3 font-mono text-xs">{page}</td>
                    <td className="p-3 text-right">{views}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <AnalyticsTracker />
    </div>
  )
}
