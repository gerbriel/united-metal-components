'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, Archive, ArchiveRestore, Trash2 } from 'lucide-react'

interface Props {
  orderId: number | string
  archived: boolean
}

// Admin-only destructive controls for an order: archive (soft, reversible) or
// permanently delete. Order lines and status history cascade on hard delete.
export default function OrderAdminActions({ orderId, archived }: Props) {
  const [loading, setLoading] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const setArchived = async (value: boolean) => {
    setLoading(value ? 'archive' : 'unarchive')
    const { error } = await supabase.from('orders').update({ archived: value }).eq('id', orderId)
    if (error) { toast.error('Failed to update order'); setLoading(null); return }
    toast.success(value ? 'Order archived' : 'Order restored')
    router.refresh()
    if (value) router.push('/dashboard/orders')
    setLoading(null)
  }

  const hardDelete = async () => {
    setLoading('delete')
    const { error } = await supabase.from('orders').delete().eq('id', orderId)
    if (error) { toast.error('Failed to delete order'); setLoading(null); return }
    toast.success('Order permanently deleted')
    router.push('/dashboard/orders')
    router.refresh()
  }

  return (
    <Card className="border-red-200">
      <CardHeader><CardTitle className="text-base text-red-700">Admin</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {archived ? (
          <Button
            variant="outline" className="w-full justify-start gap-2"
            onClick={() => setArchived(false)} disabled={!!loading}
          >
            {loading === 'unarchive' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArchiveRestore className="w-4 h-4" />}
            Restore order
          </Button>
        ) : (
          <Button
            variant="outline" className="w-full justify-start gap-2"
            onClick={() => setArchived(true)} disabled={!!loading}
          >
            {loading === 'archive' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
            Archive order
          </Button>
        )}

        {confirmDelete ? (
          <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-xs text-red-700">
              Permanently delete this order and all its line items? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button
                variant="destructive" size="sm" className="flex-1 gap-2"
                onClick={hardDelete} disabled={!!loading}
              >
                {loading === 'delete' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete
              </Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setConfirmDelete(false)} disabled={!!loading}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost" className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => setConfirmDelete(true)} disabled={!!loading}
          >
            <Trash2 className="w-4 h-4" />
            Delete permanently
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
