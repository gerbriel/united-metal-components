export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isWarehouseRole, isAdminRole, isStaffRole } from '@/types/database'
import ContactMessageList, { type ContactMessage } from '@/components/shared/ContactMessageList'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Messages — Dashboard' }

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = (profile as { role?: string } | null)?.role ?? ''
  // Customer messages are handled by office staff + admins (not warehouse).
  if (!isStaffRole(role)) redirect('/')
  if (isWarehouseRole(role) && !isAdminRole(role)) redirect('/dashboard/orders')

  // Matched customer joined via the explicit FK (the table has two FKs to
  // profiles — customer_id and handled_by — so the hint is required).
  const { data: messages } = await supabase
    .from('contact_messages')
    .select('*, customer:profiles!contact_messages_customer_id_fkey(id, full_name, company_name, email)')
    .order('created_at', { ascending: false })
    .limit(300)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-sm text-muted-foreground">
          Contact-form messages from the storefront — matched to a customer&apos;s CRM profile when possible.
        </p>
      </div>

      <ContactMessageList initial={(messages ?? []) as ContactMessage[]} />
    </div>
  )
}
