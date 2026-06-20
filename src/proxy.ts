import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// ---------------------------------------------------------------------------
// Sliding-window rate limiter (in-memory, per Edge worker instance)
// Works well for burst protection on a single-server / low-traffic site.
// For multi-region or high-traffic production, replace with Upstash Redis.
// ---------------------------------------------------------------------------

type Window = { timestamps: number[]; blocked: boolean }
const store = new Map<string, Window>()

const ROUTES: Array<{ prefix: string; limit: number; windowMs: number }> = [
  { prefix: '/login',    limit: 10,  windowMs: 60_000 },
  { prefix: '/signup',   limit: 5,   windowMs: 60_000 },
  { prefix: '/checkout', limit: 10,  windowMs: 60_000 },
  { prefix: '/contact',  limit: 10,  windowMs: 60_000 },
  { prefix: '/api',      limit: 30,  windowMs: 60_000 },
]
const DEFAULT = { limit: 200, windowMs: 60_000 }

function getConfig(pathname: string) {
  for (const r of ROUTES) {
    if (pathname.startsWith(r.prefix)) return r
  }
  return DEFAULT
}

function checkRate(ip: string, pathname: string): boolean {
  const { limit, windowMs } = getConfig(pathname)
  const now = Date.now()
  const key = `${ip}:${pathname.split('/')[1] ?? 'root'}`

  const entry = store.get(key) ?? { timestamps: [], blocked: false }
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs)

  if (entry.timestamps.length >= limit) {
    entry.blocked = true
    store.set(key, entry)
    return true
  }

  entry.timestamps.push(now)
  entry.blocked = false
  store.set(key, entry)

  // Periodically prune stale keys to prevent unbounded memory growth
  if (store.size > 5_000) {
    for (const [k, v] of store) {
      if (v.timestamps.every((t) => now - t >= windowMs)) store.delete(k)
    }
  }

  return false
}

// ---------------------------------------------------------------------------

export async function proxy(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1'

  if (checkRate(ip, request.nextUrl.pathname)) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: {
        'Content-Type': 'text/plain',
        'Retry-After': '60',
        'X-RateLimit-Limit': String(getConfig(request.nextUrl.pathname).limit),
      },
    })
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
