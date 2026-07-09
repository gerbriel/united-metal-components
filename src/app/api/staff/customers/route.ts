import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isStaffRole } from '@/types/database'

// Create a customer WITH a login account (service role). Walk-in customers use
// the staff_create_customer RPC instead and never hit this route.
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!isStaffRole((profile as { role?: string } | null)?.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json(
      { error: 'Login-account creation is not configured. Add SUPABASE_SERVICE_ROLE_KEY to the environment.' },
      { status: 501 },
    )
  }

  const body = await req.json().catch(() => ({} as Record<string, string>))
  const { first_name, last_name, email, phone, company_name } = body ?? {}
  if (!email) return NextResponse.json({ error: 'Email is required for a login account' }, { status: 400 })

  const full_name = [first_name, last_name].filter(Boolean).join(' ') || null
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true, // no verification email; customer sets a password via "forgot password"
    user_metadata: {
      first_name: first_name || null,
      last_name: last_name || null,
      full_name,
      phone: phone || null,
      company_name: company_name || null,
    },
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ id: data.user?.id, name: full_name })
}
