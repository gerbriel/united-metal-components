import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { STAFF_ROLES, type UserRole } from '@/types/database'

// OAuth / PKCE callback (Google sign-in): exchange the ?code= for a session,
// then land staff on the dashboard and everyone else on their account — the
// same role routing as the password login. First-time Google users get their
// profile row from the handle_new_user trigger (name comes from Google's
// full_name metadata), so no extra provisioning happens here. A failed or
// missing exchange bounces back to /login?error=oauth for a toast.
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Optional explicit destination (same-site paths only — no open redirect).
      const next = url.searchParams.get('next')
      if (next && next.startsWith('/') && !next.startsWith('//')) {
        return NextResponse.redirect(new URL(next, url.origin))
      }
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles').select('role, customer_type').eq('id', user.id).single()
        const profile = profileData as { role: string; customer_type: string | null } | null
        if (profile && STAFF_ROLES.includes(profile.role as UserRole)) {
          return NextResponse.redirect(new URL('/dashboard', url.origin))
        }
        // A customer with no account type yet is a fresh Google signup (the
        // password forms always set one) — finish collecting their info first.
        if (!profile?.customer_type) {
          return NextResponse.redirect(new URL('/signup/complete', url.origin))
        }
      }
      return NextResponse.redirect(new URL('/account', url.origin))
    }
  }
  return NextResponse.redirect(new URL('/login?error=oauth', url.origin))
}
