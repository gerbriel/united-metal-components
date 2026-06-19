import { createBrowserClient } from '@supabase/ssr'

let _client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (_client) return _client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key || url.startsWith('your_')) {
    // Return a no-op proxy during build / missing env — safe to call, won't error
    return new Proxy({} as ReturnType<typeof createBrowserClient>, {
      get: () => () => Promise.resolve({ data: null, error: null, count: null }),
    })
  }
  _client = createBrowserClient(url, key)
  return _client
}
