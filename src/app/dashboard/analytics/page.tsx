export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import AnalyticsCharts from '@/components/shared/AnalyticsCharts'
import AnalyticsTracker from '@/components/shared/AnalyticsTracker'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Analytics — Dashboard' }

export default async function AnalyticsPage() {
  const supabase = await createClient()

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()

  const [
    { count: totalPageviews },
    { count: uniqueSessions },
  ] = await Promise.all([
    supabase.from('analytics_events').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
    supabase.from('analytics_events').select('session_id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo).not('session_id', 'is', null),
  ])

  const { data: rawTopPages } = await supabase.from('analytics_events').select('page').gte('created_at', thirtyDaysAgo).limit(500)

  const pageMap: Record<string, number> = {}
  if (rawTopPages) {
    rawTopPages.forEach((e) => { pageMap[e.page] = (pageMap[e.page] ?? 0) + 1 })
  }
  const topPagesList = Object.entries(pageMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([page, views]) => ({ page, views }))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics (Last 30 Days)</h1>
      <p className="text-sm text-muted-foreground">Privacy-first analytics — no cookies, no third parties.</p>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Page Views', value: totalPageviews ?? 0 },
          { label: 'Sessions', value: uniqueSessions ?? 0 },
          { label: 'Top Page', value: topPagesList[0]?.page ?? '—' },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <p className="text-2xl font-bold truncate">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <AnalyticsCharts />

      {/* Top pages table */}
      <Card>
        <CardHeader><CardTitle className="text-base">Top Pages</CardTitle></CardHeader>
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
