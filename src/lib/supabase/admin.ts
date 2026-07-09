import { createClient } from '@supabase/supabase-js'

// Service-role Supabase client for privileged auth operations (creating customer
// login accounts). SERVER-ONLY — never import into a client component. Returns
// null when the key isn't configured, so callers can degrade gracefully.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
