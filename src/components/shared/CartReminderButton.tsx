'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Bell, Loader2 } from 'lucide-react'

// Sends an in-app reminder (notifications row) to a customer about their cart.
// Same insert pattern as UpdateOrderStatus / AddCrmNote; the "Staff insert
// notifications" RLS policy already allows this.
export default function CartReminderButton({ customerId, itemCount }: { customerId: string; itemCount: number }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('Items waiting in your cart')
  const [message, setMessage] = useState(
    `You have ${itemCount} item${itemCount === 1 ? '' : 's'} in your cart. Let us know if we can help you finish checking out!`,
  )
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const send = async () => {
    if (!title.trim() || !message.trim()) { toast.error('Title and message are required'); return }
    setLoading(true)
    const { error } = await supabase.from('notifications').insert({
      user_id: customerId,
      type: 'system',
      title: title.trim(),
      message: message.trim(),
    })
    if (error) { toast.error(error.message); setLoading(false); return }
    toast.success('Reminder sent')
    setOpen(false)
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <button className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/80 transition-colors">
          <Bell className="w-4 h-4" />Send reminder
        </button>
      } />
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Send cart reminder</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Message</Label>
            <Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">Sends an in-app notification to the customer.</p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={send} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Send
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
