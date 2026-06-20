import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // Unauthenticated redirects
  if (path.startsWith('/account') && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (path.startsWith('/dashboard') && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Profile checks for authenticated routes
  if (user && (path.startsWith('/account') || path.startsWith('/dashboard'))) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, account_status')
      .eq('id', user.id)
      .single()

    // Suspended customers can't access their account
    if (
      profile?.account_status === 'suspended' &&
      path.startsWith('/account') &&
      path !== '/account/orders' // allow viewing past orders
    ) {
      return NextResponse.redirect(new URL('/suspended', request.url))
    }

    // Dashboard requires staff role
    if (path.startsWith('/dashboard')) {
      const STAFF_ROLES = ['employee', 'office_employee', 'warehouse_employee', 'admin']
      if (!profile || !STAFF_ROLES.includes((profile as any).role)) {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }
  }

  return supabaseResponse
}
