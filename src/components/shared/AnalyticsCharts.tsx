'use client'

import { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'

interface DayData { date: string; views: number }

export default function AnalyticsCharts() {
  const [data, setData] = useState<DayData[]>([])
  const supabase = createClient()

  useEffect(() => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
    supabase
      .from('analytics_events')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo)
      .then(({ data: events }) => {
        if (!events) return
        const map: Record<string, number> = {}
        events.forEach((e) => {
          const date = e.created_at.slice(0, 10)
          map[date] = (map[date] ?? 0) + 1
        })
        const sorted = Object.entries(map)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([date, views]) => ({ date: date.slice(5), views }))
        setData(sorted)
      })
  }, [])

  if (data.length === 0) return null

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Daily Page Views</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Area type="monotone" dataKey="views" stroke="var(--color-primary)" fill="url(#colorViews)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
