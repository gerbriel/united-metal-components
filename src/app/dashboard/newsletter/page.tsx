export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import NewsletterComposer from '@/components/shared/NewsletterComposer'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Newsletter — Dashboard' }

export default async function NewsletterPage() {
  const supabase = await createClient()

  const [{ data: subscribers, count }, { data: campaigns }] = await Promise.all([
    supabase.from('newsletter_subscribers').select('*', { count: 'exact' }).eq('status', 'active').order('subscribed_at', { ascending: false }),
    supabase.from('newsletter_campaigns').select('*').order('created_at', { ascending: false }),
  ])

  const statusColors: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700',
    scheduled: 'bg-blue-100 text-blue-700',
    sent: 'bg-green-100 text-green-700',
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Newsletter</h1>
        <div className="text-sm text-muted-foreground">{count ?? 0} active subscribers</div>
      </div>

      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
          <TabsTrigger value="compose">Compose</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-3 mt-4">
          {campaigns?.length === 0 && <p className="text-muted-foreground text-sm">No campaigns yet.</p>}
          {campaigns?.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{c.subject}</p>
                  {c.preview_text && <p className="text-xs text-muted-foreground">{c.preview_text}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{new Date(c.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full capitalize font-medium ${statusColors[c.status]}`}>
                  {c.status}
                </span>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="subscribers" className="mt-4">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-muted-foreground border-b">
                  <tr>
                    <th className="text-left p-3">Email</th>
                    <th className="text-left p-3">Name</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Subscribed</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {subscribers?.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="p-3">{s.email}</td>
                      <td className="p-3 text-muted-foreground">{s.name ?? '—'}</td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">{new Date(s.subscribed_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="compose" className="mt-4">
          <NewsletterComposer />
        </TabsContent>
      </Tabs>
    </div>
  )
}
