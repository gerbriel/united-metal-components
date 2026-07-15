export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isAdminRole } from '@/types/database'
import { getSiteContent } from '@/lib/site-content'
import SiteContentManager from '@/components/shared/SiteContentManager'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Site Content — Dashboard' }

export default async function SiteContentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!isAdminRole((profile as { role?: string } | null)?.role ?? '')) redirect('/dashboard')

  const content = await getSiteContent(supabase)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Site Content</h1>
        <p className="text-sm text-muted-foreground">
          Business hours, holiday hours, and the Privacy Policy / Terms of Service pages.
        </p>
      </div>
      <SiteContentManager
        initialHours={content.hours}
        initialPrivacy={content.privacyHtml}
        initialTerms={content.termsHtml}
      />
    </div>
  )
}
