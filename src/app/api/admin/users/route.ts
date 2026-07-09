import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminRole } from '@/types/database'

// Create / delete user accounts — ADMIN ONLY. Uses the service-role client for
// the privileged auth operations. Office staff create customers via the CRM's
// staff_create_customer flow instead; this route can mint any role, including
// admins, so it's locked to admins.

const VALID_ROLES = ['customer', 'office_employee', 'warehouse_employee', 'admin']

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, status: 401, error: 'Unauthorized' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!isAdminRole((profile as { role?: string } | null)?.role ?? '')) {
    return { ok: false as const, status: 403, error: 'Forbidden — admins only' }
  }
  return { ok: true as const, user, supabase }
}

export async function POST(req: Request) {
  const gate = await requireAdmin()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })
  const { supabase } = gate

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json(
      { error: 'User creation is not configured. Add SUPABASE_SERVICE_ROLE_KEY to the environment.' },
      { status: 501 },
    )
  }

  const body = await req.json().catch(() => ({} as Record<string, string>))
  const { first_name, last_name, email, phone, company_name, role } = body ?? {}
  if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  const newRole = VALID_ROLES.includes(role) ? role : 'customer'

  const full_name = [first_name, last_name].filter(Boolean).join(' ') || null

  // Create the auth user (pre-confirmed so it's immediately usable). The
  // handle_new_user trigger inserts the profile row with the default role.
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      first_name: first_name || null,
      last_name: last_name || null,
      full_name,
      phone: phone || null,
      company_name: company_name || null,
    },
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  const newId = data.user?.id
  if (!newId) return NextResponse.json({ error: 'Account created but no id was returned' }, { status: 500 })

  // Set the chosen role + profile fields (service role bypasses RLS).
  const { error: upErr } = await admin
    .from('profiles')
    .update({
      role: newRole,
      first_name: first_name || null,
      last_name: last_name || null,
      full_name,
      phone: phone || null,
      company_name: company_name || null,
    })
    .eq('id', newId)
  if (upErr) return NextResponse.json({ error: `Account created but profile update failed: ${upErr.message}` }, { status: 500 })

  // Email a set-password link (best-effort — the account already exists).
  const origin = req.headers.get('origin') ?? new URL(req.url).origin
  const { error: mailError } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  })

  return NextResponse.json({ id: newId, name: full_name, role: newRole, emailed: !mailError })
}

export async function DELETE(req: Request) {
  const gate = await requireAdmin()
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })
  const { supabase, user } = gate

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json(
      { error: 'User deletion is not configured. Add SUPABASE_SERVICE_ROLE_KEY to the environment.' },
      { status: 501 },
    )
  }

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing user id' }, { status: 400 })
  if (id === user.id) return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 })

  // orders.customer_id is RESTRICT, so deleting a customer with orders would fail
  // at the DB — refuse up front with a clear message (suspend them instead).
  const { count } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', id)
  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: `This user has ${count} order${count === 1 ? '' : 's'} on file — suspend them instead of deleting.` },
      { status: 409 },
    )
  }

  // Cascades to the profile (profiles.id → auth.users ON DELETE CASCADE).
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
