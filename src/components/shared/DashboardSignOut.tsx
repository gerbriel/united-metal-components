'use client'

import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function DashboardSignOut() {
  const supabase = createClient()
  const router = useRouter()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <button onClick={handleSignOut}
      className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-sidebar-foreground/70 hover:text-red-400 hover:bg-sidebar-accent transition-colors">
      <LogOut className="w-4 h-4" /> Sign Out
    </button>
  )
}
