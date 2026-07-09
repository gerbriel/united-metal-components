'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Mail, Phone, User, UserCheck, UserX, Check, Inbox, Info, Archive, ArchiveRestore, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export interface ContactMessage {
  id: number
  name: string
  email: string
  phone: string | null
  message: string
  subscribed: boolean
  read: boolean
  archived: boolean
  created_at: string
  customer: { id: string; full_name: string | null; company_name: string | null; email: string | null } | null
}

const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

export default function ContactMessageList({
  initial,
  canDelete,
}: {
  initial: ContactMessage[]
  canDelete: boolean
}) {
  // Local, optimistic overrides keyed by message id. The server list (`initial`)
  // stays the source of truth — a router.refresh() reconciles it — so we never
  // copy props into state.
  const [readOverrides, setReadOverrides] = useState<Record<number, boolean>>({})
  const [archivedOverrides, setArchivedOverrides] = useState<Record<number, boolean>>({})
  const [deletedIds, setDeletedIds] = useState<Set<number>>(new Set())
  const [view, setView] = useState<'inbox' | 'archived'>('inbox')
  const supabase = createClient()
  const router = useRouter()

  // New submissions arrive in real time — refetch (with the customer join) so
  // the matched CRM profile shows up too.
  useEffect(() => {
    const channel = supabase
      .channel('contact-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'contact_messages' }, () => router.refresh())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, router])

  const setRead = async (id: number, read: boolean) => {
    setReadOverrides((o) => ({ ...o, [id]: read }))
    const { error } = await supabase.from('contact_messages').update({ read }).eq('id', id)
    if (error) {
      setReadOverrides((o) => ({ ...o, [id]: !read }))
      toast.error('Could not update the message')
    }
  }

  const setArchived = async (id: number, archived: boolean) => {
    setArchivedOverrides((o) => ({ ...o, [id]: archived }))
    // Archiving a message also marks it read — it's out of the active inbox.
    const patch = archived ? { archived, read: true } : { archived }
    const { error } = await supabase.from('contact_messages').update(patch).eq('id', id)
    if (error) {
      setArchivedOverrides((o) => ({ ...o, [id]: !archived }))
      toast.error(`Could not ${archived ? 'archive' : 'unarchive'} the message`)
      return
    }
    if (archived) setReadOverrides((o) => ({ ...o, [id]: true }))
    toast.success(archived ? 'Message archived' : 'Message restored to inbox')
  }

  const remove = async (id: number) => {
    if (!confirm('Delete this message permanently? This can’t be undone.')) return
    setDeletedIds((s) => new Set(s).add(id))
    const { error } = await supabase.from('contact_messages').delete().eq('id', id)
    if (error) {
      setDeletedIds((s) => { const n = new Set(s); n.delete(id); return n })
      toast.error('Could not delete the message')
      return
    }
    toast.success('Message deleted')
  }

  // Apply optimistic overrides, then drop deleted rows.
  const all = initial
    .filter((m) => !deletedIds.has(m.id))
    .map((m) => ({
      ...m,
      read: m.id in readOverrides ? readOverrides[m.id] : m.read,
      archived: m.id in archivedOverrides ? archivedOverrides[m.id] : m.archived,
    }))

  const inbox = all.filter((m) => !m.archived)
  const archivedList = all.filter((m) => m.archived)
  const messages = view === 'inbox' ? inbox : archivedList
  const unread = inbox.filter((m) => !m.read).length

  return (
    <div className="space-y-4">
      {/* How matching works */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-900">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <p>
          Messages are synced to an existing customer by <strong>email</strong>, then <strong>phone</strong>. Ask
          customers to include their name, email, and phone so we can link the message to their CRM profile.
        </p>
      </div>

      {/* Inbox / Archived tabs */}
      <div className="inline-flex rounded-lg border bg-muted/40 p-0.5 text-sm">
        <button
          type="button"
          onClick={() => setView('inbox')}
          className={`rounded-md px-3 py-1.5 font-medium transition-colors ${view === 'inbox' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Inbox{inbox.length ? ` (${inbox.length})` : ''}
        </button>
        <button
          type="button"
          onClick={() => setView('archived')}
          className={`rounded-md px-3 py-1.5 font-medium transition-colors ${view === 'archived' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Archived{archivedList.length ? ` (${archivedList.length})` : ''}
        </button>
      </div>

      {view === 'inbox' && unread > 0 && (
        <p className="text-sm text-muted-foreground">{unread} unread of {inbox.length}</p>
      )}

      {messages.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Inbox className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{view === 'inbox' ? 'No messages in the inbox.' : 'No archived messages.'}</p>
        </div>
      ) : (
        messages.map((m) => {
          const customerName = m.customer?.full_name || m.customer?.company_name || m.customer?.email || 'Customer'
          return (
            <Card key={m.id} className={m.read ? '' : 'border-l-4 border-l-orange-500'}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <User className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="font-semibold truncate">{m.name}</span>
                    {!m.read && <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">New</Badge>}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{fmtWhen(m.created_at)}</span>
                </div>

                {/* Contact details */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                  <a href={`mailto:${m.email}`} className="inline-flex items-center gap-1.5 hover:text-primary">
                    <Mail className="w-3.5 h-3.5" />{m.email}
                  </a>
                  {m.phone && (
                    <a href={`tel:${m.phone}`} className="inline-flex items-center gap-1.5 hover:text-primary">
                      <Phone className="w-3.5 h-3.5" />{m.phone}
                    </a>
                  )}
                </div>

                {/* CRM link / no-match */}
                {m.customer ? (
                  <Link
                    href={`/dashboard/crm/${m.customer.id}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700 hover:underline"
                  >
                    <UserCheck className="w-4 h-4" />
                    Linked to {customerName} — open CRM profile
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-sm text-amber-600">
                    <UserX className="w-4 h-4" />
                    No matching customer found
                  </span>
                )}

                <p className="text-sm whitespace-pre-wrap border-t pt-3">{m.message}</p>

                <div className="flex items-center justify-end gap-2">
                  {canDelete && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1 text-muted-foreground hover:text-destructive"
                      onClick={() => remove(m.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </Button>
                  )}
                  {m.archived ? (
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => setArchived(m.id, false)}>
                      <ArchiveRestore className="w-3.5 h-3.5" /> Unarchive
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => setArchived(m.id, true)}>
                      <Archive className="w-3.5 h-3.5" /> Archive
                    </Button>
                  )}
                  {m.read ? (
                    <Button size="sm" variant="ghost" onClick={() => setRead(m.id, false)}>
                      Mark unread
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => setRead(m.id, true)}>
                      <Check className="w-3.5 h-3.5" /> Mark as read
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}
