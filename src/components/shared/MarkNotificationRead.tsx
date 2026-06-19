'use client'

import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function MarkNotificationRead({ userId }: { userId: string }) {
  const supabase = createClient()
  const router = useRouter()

  const markAll = async () => {
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
    router.refresh()
  }

  return (
    <Button variant="outline" size="sm" onClick={markAll}>Mark all read</Button>
  )
}
