export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isAdminRole, isStaffRole, type Announcement, type AnnouncementStats } from '@/types/database'
import { announcementStatus } from '@/lib/announcements'
import AnnouncementManager, { type AnnouncementRow } from '@/components/shared/AnnouncementManager'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Announcements — Dashboard' }

export default async function AnnouncementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = (profile as { role?: string } | null)?.role ?? ''
  if (!isStaffRole(role)) redirect('/')
  if (!isAdminRole(role)) redirect('/dashboard')

  const [{ data: rows }, { data: stats }] = await Promise.all([
    supabase.from('announcements').select('*')
      .order('priority', { ascending: false })
      .order('id', { ascending: false }),
    supabase.from('announcement_stats').select('*'),
  ])

  const statMap = new Map<number, AnnouncementStats>(
    (stats ?? []).map((s) => [(s as AnnouncementStats).announcement_id, s as AnnouncementStats]),
  )
  const nowMs = new Date().getTime()
  const initial: AnnouncementRow[] = ((rows ?? []) as Announcement[]).map((a) => {
    const s = statMap.get(a.id)
    return {
      ...a,
      status:      announcementStatus(a, nowMs),
      impressions: Number(s?.impressions ?? 0),
      clicks:      Number(s?.clicks ?? 0),
      dismisses:   Number(s?.dismisses ?? 0),
    }
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Announcements &amp; Promotions</h1>
        <p className="text-sm text-muted-foreground">
          Banners and popups shown to storefront visitors. Schedule them, target specific pages, add UTM
          tracking, and watch impressions and clicks.
        </p>
      </div>
      <AnnouncementManager initial={initial} />
    </div>
  )
}
