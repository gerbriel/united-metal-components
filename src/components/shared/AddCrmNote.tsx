'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function AddCrmNote({ customerId }: { customerId: string }) {
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const handleAdd = async () => {
    if (!body.trim()) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('crm_notes').insert({
      customer_id: customerId,
      author_id: user?.id ?? null,
      body: body.trim(),
    })
    if (error) { toast.error('Failed to add note'); setLoading(false); return }
    toast.success('Note added')
    setBody('')
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="space-y-2">
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add a note..." rows={2} />
      <Button size="sm" onClick={handleAdd} disabled={loading || !body.trim()}>
        {loading && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}Add Note
      </Button>
    </div>
  )
}
