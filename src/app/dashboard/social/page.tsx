export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import SocialPostComposer from '@/components/shared/SocialPostComposer'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Social Posts — Dashboard' }

const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  scheduled: 'bg-blue-100 text-blue-700',
  published: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
}

export default async function SocialPage() {
  const supabase = await createClient()
  const { data: posts } = await supabase
    .from('social_posts')
    .select('*')
    .order('created_at', { ascending: false })

  const scheduled = posts?.filter((p) => p.status === 'scheduled') ?? []
  const drafts = posts?.filter((p) => p.status === 'draft') ?? []
  const published = posts?.filter((p) => p.status === 'published') ?? []

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Social Post Scheduler</h1>

      <Tabs defaultValue="compose">
        <TabsList>
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled ({scheduled.length})</TabsTrigger>
          <TabsTrigger value="drafts">Drafts ({drafts.length})</TabsTrigger>
          <TabsTrigger value="published">Published ({published.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="mt-4">
          <SocialPostComposer />
        </TabsContent>

        {(['scheduled', 'drafts', 'published'] as const).map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4 space-y-3">
            {(tab === 'scheduled' ? scheduled : tab === 'drafts' ? drafts : published).map((p) => (
              <Card key={p.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm whitespace-pre-wrap">{p.content}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {p.platforms.map((pl: string) => (
                          <span key={pl} className="text-xs bg-slate-100 px-2 py-0.5 rounded capitalize">{pl}</span>
                        ))}
                      </div>
                      {p.scheduled_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Scheduled: {new Date(p.scheduled_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full capitalize font-medium shrink-0 ${statusColors[p.status]}`}>
                      {p.status}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(tab === 'scheduled' ? scheduled : tab === 'drafts' ? drafts : published).length === 0 && (
              <p className="text-muted-foreground text-sm">No posts here yet.</p>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
