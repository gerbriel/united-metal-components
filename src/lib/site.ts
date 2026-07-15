// Canonical site origin for absolute URLs (sitemap, robots, JSON-LD, canonical
// links, OG tags). Set NEXT_PUBLIC_SITE_URL in production; falls back to the
// known production domain so generated URLs are never localhost in a build.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.unitedmetalcomponents.com').replace(/\/+$/, '')
