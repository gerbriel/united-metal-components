import type { NextConfig } from 'next'

const isProd = process.env.NODE_ENV === 'production'

// Content Security Policy
// unsafe-inline: required by Tailwind CSS runtime injection
// unsafe-eval: required by framer-motion
// connect-src: Supabase REST + Realtime WebSocket
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join('; ')

const securityHeaders = [
  { key: 'X-Frame-Options',          value: 'DENY' },
  { key: 'X-Content-Type-Options',   value: 'nosniff' },
  { key: 'X-XSS-Protection',         value: '1; mode=block' },
  { key: 'Referrer-Policy',          value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',       value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Content-Security-Policy',  value: csp },
  ...(isProd
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
    : []),
]

const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      // CORS for /api/* routes
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Access-Control-Allow-Origin',      value: siteOrigin },
          { key: 'Access-Control-Allow-Methods',     value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers',     value: 'Content-Type, Authorization, X-Requested-With' },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Max-Age',           value: '86400' },
        ],
      },
    ]
  },
}

export default nextConfig
