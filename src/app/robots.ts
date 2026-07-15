import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

// Private / non-indexable areas — same block list applied to every crawler.
const DISALLOW = ['/dashboard', '/account', '/api', '/login', '/signup', '/checkout', '/cart', '/reset-password', '/suspended', '/pending']

// AI crawlers & answer engines we explicitly welcome (listing them signals
// "come on in" and guards against any default block).
const AI_AGENTS = [
  'GPTBot', 'ChatGPT-User', 'OAI-SearchBot',
  'ClaudeBot', 'Claude-Web', 'anthropic-ai',
  'PerplexityBot', 'Perplexity-User',
  'Google-Extended', 'Applebot-Extended', 'CCBot', 'cohere-ai', 'Bytespider',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: DISALLOW },
      ...AI_AGENTS.map((userAgent) => ({ userAgent, allow: '/', disallow: DISALLOW })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
