export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import NewsletterComposer from '@/components/shared/NewsletterComposer'
import { Users, Send, Clock } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Newsletter — Dashboard' }

export default async function NewsletterPage() {
  const supabase = await createClient()

  const [
    { data: subscribers, count: subscriberCount },
    { data: campaigns },
  ] = await Promise.all([
    supabase
      .from('newsletter_subscribers')
      .select('*', { count: 'exact' })
      .eq('status', 'active')
      .order('subscribed_at', { ascending: false }),
    supabase
      .from('newsletter_campaigns')
      .select('*, profiles(first_name, last_name, full_name), newsletter_campaign_recipients(id)')
      .order('created_at', { ascending: false }),
  ])

  const STATUS_COLORS: Record<string, string> = {
    draft:     'bg-slate-100 text-slate-700',
    scheduled: 'bg-blue-100 text-blue-700',
    sent:      'bg-green-100 text-green-700',
  }

  const activeSubscribers = (subscribers ?? []).map((s) => ({
    id: s.id,
    email: s.email,
    name: s.name ?? null,
  }))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Newsletter</h1>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          {subscriberCount ?? 0} active subscribers
        </div>
      </div>

      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
          <TabsTrigger value="compose">Compose</TabsTrigger>
        </TabsList>

        {/* Campaigns list */}
        <TabsContent value="campaigns" className="space-y-3 mt-4">
          {(!campaigns || campaigns.length === 0) && (
            <p className="text-muted-foreground text-sm">No campaigns yet.</p>
          )}
          {campaigns?.map((c) => {
            const sender = c.profiles as any
            const senderName = sender?.first_name && sender?.last_name
              ? `${sender.first_name} ${sender.last_name}`
              : sender?.full_name ?? 'Unknown'
            const recipientCount = (c.newsletter_campaign_recipients as any[])?.length ?? 0

            return (
              <Card key={c.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{c.subject}</p>
                      {c.preview_text && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.preview_text}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          {c.sent_at && ` · Sent ${new Date(c.sent_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
                        </span>
                        <span>Sent by: <span className="font-medium text-foreground">{senderName}</span></span>
                        {c.status === 'sent' && (
                          <span className="flex items-center gap-1">
                            <Send className="w-3 h-3" />
                            {recipientCount} recipient{recipientCount !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full capitalize font-medium shrink-0 ${STATUS_COLORS[c.status]}`}>
                      {c.status}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </TabsContent>

        {/* Subscribers list */}
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
                      <td className="p-3 text-muted-foreground">
                        {new Date(s.subscribed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Compose */}
        <TabsContent value="compose" className="mt-4">
          <NewsletterComposer subscribers={activeSubscribers} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
